import { onMessage } from '@/lib/messaging/bridge';
import type { Message, MessageResponse } from '@/lib/messaging/messages';
import * as auth from '@/lib/services/auth.service';
import * as sheets from '@/lib/services/sheets.service';
import * as storage from '@/lib/services/storage.service';
import * as gmail from '@/lib/services/gmail.service';
import * as queue from '@/lib/services/queue.service';
import { GMAIL_CHECK_INTERVAL_MINUTES } from '@/lib/utils/constants';

/**
 * Badge shows the count of unseen status auto-updates (from Gmail).
 * Cleared by popup on open via MARK_SEEN message.
 */
async function updateBadge() {
  const count = await storage.get('unseenUpdates');
  const text = count > 0 ? String(count) : '';
  await chrome.action.setBadgeText({ text });
  if (count > 0) {
    await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  }
}

function notify(title: string, message: string) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon/128.png'),
    title,
    message,
  });
}

async function setSyncing(value: boolean) {
  await storage.set('syncing', value);
}

/**
 * Pull fresh rows from Sheets and write to local storage.
 * Fire-and-forget — caller does not await result. Popup observes
 * storage changes and re-renders automatically.
 */
async function backgroundSync(): Promise<void> {
  await setSyncing(true);
  try {
    // Check Gmail first so any new status updates flow into the sheet,
    // then pull fresh rows so the popup sees both Sheet edits and the
    // status auto-updates from email analysis in a single refresh.
    await gmail.checkNewEmails().catch((err) => console.error('[VT] gmail check failed', err));
    const rows = await sheets.getRows();
    await storage.set('applications', rows);
    await storage.set('cacheTimestamp', Date.now());
    await updateBadge();
  } catch (err) {
    console.error('[VT] sync failed', err);
  } finally {
    await setSyncing(false);
  }
}

export default defineBackground(() => {
  chrome.alarms.create('gmail-check', { periodInMinutes: GMAIL_CHECK_INTERVAL_MINUTES });
  chrome.alarms.create('process-queue', { periodInMinutes: 2 });
  // Periodic background sync — keeps local storage fresh even when popup not opened
  chrome.alarms.create('bg-sync', { periodInMinutes: 10 });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'gmail-check') {
      await gmail.checkNewEmails();
      await updateBadge();
    }
    if (alarm.name === 'process-queue') {
      await queue.processQueue({
        append: sheets.appendRow,
        updateStatus: sheets.updateStatus,
      });
      await updateBadge();
    }
    if (alarm.name === 'bg-sync') {
      const authed = await auth.isAuthenticated();
      if (authed) await backgroundSync();
    }
  });

  chrome.runtime.onInstalled.addListener(() => {
    updateBadge();
  });

  onMessage(async (message: Message): Promise<MessageResponse> => {
    switch (message.type) {
      case 'APPLICATION_SUBMITTED': {
        // Fire-and-forget — popup already updated locally
        (async () => {
          await setSyncing(true);
          try {
            await sheets.appendRow(message.payload);
            const rows = await sheets.getRows();
            await storage.set('applications', rows);
            await updateBadge();
            notify('Відгук записано', `${message.payload.company} — ${message.payload.role}`);
          } catch (error) {
            await queue.enqueue({ action: 'append', data: message.payload });
            notify('Відгук збережено офлайн', `${message.payload.company} — синхронізується пізніше`);
          } finally {
            await setSyncing(false);
          }
        })();
        return { success: true };
      }

      case 'FETCH_APPLICATIONS': {
        // Kept for backwards compat — same as SYNC but returns rows
        try {
          await setSyncing(true);
          const rows = await sheets.getRows();
          await storage.set('applications', rows);
          await storage.set('cacheTimestamp', Date.now());
          return { success: true, data: rows };
        } catch (error) {
          return { success: false, error: String(error) };
        } finally {
          await setSyncing(false);
        }
      }

      case 'SYNC': {
        // Non-blocking — popup keeps showing local data while we sync
        backgroundSync();
        return { success: true };
      }

      case 'OPEN_SPREADSHEET': {
        try {
          const url = await sheets.getSpreadsheetUrl();
          return { success: true, data: url };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }

      case 'UPDATE_STATUS': {
        // Fire-and-forget — popup already updated locally
        (async () => {
          await setSyncing(true);
          try {
            await sheets.updateStatus(message.payload.rowIndex, message.payload.status);
            const rows = await sheets.getRows();
            await storage.set('applications', rows);
            await updateBadge();
          } catch (error) {
            await queue.enqueue({ action: 'updateStatus', ...message.payload });
          } finally {
            await setSyncing(false);
          }
        })();
        return { success: true };
      }

      case 'GET_AUTH_STATE': {
        const authenticated = await auth.isAuthenticated();
        return { success: true, data: authenticated };
      }

      case 'SIGN_IN': {
        try {
          const token = await auth.getToken(true);
          return { success: true, data: token !== null };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }

      case 'MARK_SEEN': {
        await storage.set('unseenUpdates', 0);
        await updateBadge();
        return { success: true };
      }

      case 'SIGN_OUT': {
        // Full revoke — needed when manifest scopes change so user
        // re-consents with the fresh set on next sign-in.
        await auth.clearAllTokens();
        // Clear local cache so next sign-in starts fresh
        await storage.set('applications', []);
        await storage.set('spreadsheetId', null);
        await updateBadge();
        return { success: true };
      }
    }
  });
});
