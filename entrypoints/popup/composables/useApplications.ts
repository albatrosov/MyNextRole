import { ref, onMounted, onUnmounted } from 'vue';
import type { ApplicationData, ApplicationRow, ResultStatus } from '@/lib/types/application';
import { DEFAULT_RESULT } from '@/lib/utils/constants';
import { sendMessage } from '@/lib/messaging/bridge';

/**
 * Local-first state for applications.
 *
 * - Reads from chrome.storage.local on mount → instant render, no spinner
 *   unless storage is genuinely empty.
 * - Subscribes to chrome.storage.onChanged → background sheet writes flow
 *   back into the popup live.
 * - Mutations (status change, manual add) update local state and storage
 *   IMMEDIATELY, then fire-and-forget a message to the background which
 *   does the slow Sheets API write. Stats, badges, and table all see the
 *   change instantly.
 */
export function useApplications() {
  const applications = ref<ApplicationRow[]>([]);
  const loaded = ref(false);
  const syncing = ref(false);

  let storageListener: Parameters<typeof chrome.storage.onChanged.addListener>[0] | null = null;

  async function loadFromStorage() {
    const result = await chrome.storage.local.get(['applications', 'syncing']);
    applications.value = (result.applications as ApplicationRow[]) ?? [];
    syncing.value = Boolean(result.syncing);
    loaded.value = true;
  }

  function subscribe() {
    storageListener = (changes, area) => {
      if (area !== 'local') return;
      if (changes.applications) {
        applications.value = (changes.applications.newValue as ApplicationRow[]) ?? [];
      }
      if (changes.syncing) {
        syncing.value = Boolean(changes.syncing.newValue);
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
  }

  function unsubscribe() {
    if (storageListener) {
      chrome.storage.onChanged.removeListener(storageListener);
      storageListener = null;
    }
  }

  onMounted(async () => {
    await loadFromStorage();
    subscribe();
  });

  onUnmounted(unsubscribe);

  /** Trigger background sync without blocking UI. */
  function sync() {
    sendMessage({ type: 'SYNC' });
  }

  /**
   * Optimistic status change — mutate local array + storage immediately
   * so stats / badges / dropdown all update before the Sheets round-trip.
   * Background writes to sheet, then refreshes storage with confirmed rows.
   */
  async function updateStatus(rowIndex: number, status: ResultStatus) {
    const idx = applications.value.findIndex((a) => a.rowIndex === rowIndex);
    if (idx >= 0) {
      const next = [...applications.value];
      next[idx] = { ...next[idx], result: status };
      applications.value = next;
      await chrome.storage.local.set({ applications: next });
    }
    sendMessage({ type: 'UPDATE_STATUS', payload: { rowIndex, status } });
  }

  /**
   * Optimistic add — insert with negative temporary rowIndex. Background
   * writes to sheet and re-reads, then storage replaces with real rows
   * (proper rowIndex). Brief moment of mismatch is acceptable.
   */
  async function addApplication(data: ApplicationData) {
    const tempIndex = -Date.now();
    const date = new Date(data.timestamp).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const optimistic: ApplicationRow = {
      ...data,
      date,
      result: DEFAULT_RESULT,
      rowIndex: tempIndex,
    };
    const next = [optimistic, ...applications.value];
    applications.value = next;
    await chrome.storage.local.set({ applications: next });
    sendMessage({ type: 'APPLICATION_SUBMITTED', payload: data });
  }

  function clear() {
    applications.value = [];
    chrome.storage.local.set({ applications: [] });
  }

  return {
    applications,
    loaded,
    syncing,
    sync,
    updateStatus,
    addApplication,
    clear,
  };
}
