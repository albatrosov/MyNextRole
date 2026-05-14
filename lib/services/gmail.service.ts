import * as auth from './auth.service';
import * as storage from './storage.service';
import * as sheets from './sheets.service';

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_BODY_CHARS = 16_000;
const INITIAL_SCAN_LIMIT = 50;

function log(..._args: unknown[]): void {
  // No-op in production. Re-add console.log here for local debugging.
}

async function fetchGmail(path: string): Promise<Response> {
  const token = await auth.getToken(false);
  if (!token) throw new Error('Not authenticated');

  return fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function getHistory(historyId: string): Promise<any[]> {
  const response = await fetchGmail(
    `/history?startHistoryId=${historyId}&historyTypes=messageAdded`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      log('history 404 — startHistoryId expired, will reinitialize');
      return [];
    }
    throw new Error(`Gmail API error: ${response.status}`);
  }

  const data = await response.json();
  return data.history ?? [];
}

function decodeBase64Url(encoded: string): string {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBodyText(payload: any): string {
  if (!payload) return '';

  const plainParts: string[] = [];
  const htmlParts: string[] = [];

  function walk(node: any) {
    if (!node) return;
    const mimeType = node.mimeType ?? '';
    const data = node.body?.data;
    if (data) {
      const decoded = decodeBase64Url(data);
      if (mimeType === 'text/plain') plainParts.push(decoded);
      else if (mimeType === 'text/html') htmlParts.push(decoded);
    }
    if (Array.isArray(node.parts)) {
      for (const part of node.parts) walk(part);
    }
  }

  walk(payload);

  let text = plainParts.join('\n');
  if (!text) text = stripHtml(htmlParts.join('\n'));
  return text.slice(0, MAX_BODY_CHARS);
}

async function getMessage(messageId: string): Promise<{ subject: string; from: string; text: string }> {
  const response = await fetchGmail(`/messages/${messageId}?format=full`);
  const data = await response.json();

  const headers = data.payload?.headers ?? [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value ?? '';
  const from = headers.find((h: any) => h.name === 'From')?.value ?? '';

  const snippet = data.snippet ?? '';
  const body = extractBodyText(data.payload);
  return { subject, from, text: `${snippet}\n${body}` };
}

async function getLatestHistoryId(): Promise<string | null> {
  const response = await fetchGmail('/messages?maxResults=1');
  if (!response.ok) return null;

  const data = await response.json();
  const messageId = data.messages?.[0]?.id;
  if (!messageId) return null;

  const msgResponse = await fetchGmail(`/messages/${messageId}?format=minimal`);
  const msgData = await msgResponse.json();
  return msgData.historyId ?? null;
}

/**
 * Process one Gmail message: analyze status only. Application matching
 * is intentionally disabled — see commit history. Returns false always
 * so no Sheet write happens automatically.
 */
async function processMessage(_messageId: string, _applications: any[]): Promise<boolean> {
  // Auto-matching disabled: Gmail polling no longer auto-updates rows.
  // analyzeEmail still callable directly if needed by future flows.
  return false;
}

/**
 * First-time initialization: scan recent messages directly instead of
 * just storing the latest historyId. Without this, the email that
 * triggers the first poll gets skipped (its historyId is what we save,
 * subsequent fetches return messages strictly AFTER it).
 */
async function initialScan(applications: any[]): Promise<void> {
  log('initial scan: fetching recent messages');
  const response = await fetchGmail(`/messages?maxResults=${INITIAL_SCAN_LIMIT}&q=newer_than:7d`);
  if (!response.ok) {
    log('initial scan failed', response.status);
    return;
  }
  const data = await response.json();
  const messages = data.messages ?? [];
  log(`initial scan: found ${messages.length} messages`);

  let updated = false;
  for (const { id } of messages) {
    if (await processMessage(id, applications)) updated = true;
  }

  if (updated) {
    const rows = await sheets.getRows();
    await storage.set('applications', rows);
  }
}

export async function checkNewEmails(): Promise<void> {
  const isAuth = await auth.isAuthenticated();
  if (!isAuth) {
    log('not authenticated, skipping');
    return;
  }

  let historyId = await storage.get('lastHistoryId');
  const applications = await storage.get('applications');

  if (!historyId) {
    log('first run — performing initial scan');
    await initialScan(applications);
    historyId = await getLatestHistoryId();
    if (historyId) {
      await storage.set('lastHistoryId', historyId);
      log('saved initial historyId', historyId);
    }
    return;
  }

  log('polling history since', historyId);
  const history = await getHistory(historyId);
  log(`history returned ${history.length} entries`);

  // History was invalid (e.g. 404) — restart from initial scan
  if (history.length === 0) {
    const latest = await getLatestHistoryId();
    if (latest && latest !== historyId) {
      await storage.set('lastHistoryId', latest);
    }
  }

  let updated = false;
  for (const entry of history) {
    const messages = entry.messagesAdded ?? [];
    for (const { message } of messages) {
      if (await processMessage(message.id, applications)) updated = true;
    }

    if (entry.id) {
      await storage.set('lastHistoryId', entry.id);
    }
  }

  if (updated) {
    const rows = await sheets.getRows();
    await storage.set('applications', rows);
    log('applications refreshed after status updates');
  }
}
