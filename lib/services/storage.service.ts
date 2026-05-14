import type { ApplicationRow } from '../types/application';

interface StorageSchema {
  spreadsheetId: string | null;
  applications: ApplicationRow[];
  lastHistoryId: string | null;
  cacheTimestamp: number;
  syncing: boolean;
  /** Count of status auto-updates not yet seen by the user. Shown as a
   *  toolbar badge; reset to 0 when the popup opens. */
  unseenUpdates: number;
}

const DEFAULTS: StorageSchema = {
  spreadsheetId: null,
  applications: [],
  lastHistoryId: null,
  cacheTimestamp: 0,
  syncing: false,
  unseenUpdates: 0,
};

export async function get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as StorageSchema[K]) ?? DEFAULTS[key];
}

export async function set<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K],
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getAll(): Promise<StorageSchema> {
  const result = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...result } as StorageSchema;
}
