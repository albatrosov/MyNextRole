export const SHEET_NAME = 'MyNextRole';

export const SHEET_HEADERS = [
  'Date',
  'Source',
  'URL',
  'Company',
  'Role',
  'Cover Letter',
  'Result',
] as const;

export const PAGE_SIZE = 20;

export const RESULT_OPTIONS = [
  'pending',
  'rejected',
  'interview',
  'test task',
  'offer',
] as const;

export const DEFAULT_RESULT = 'pending';

/**
 * Map legacy Ukrainian status strings to current English values.
 * Existing spreadsheets may have rows written before the status
 * vocabulary was translated — translate them on read so the extension
 * sees a consistent type.
 */
export const LEGACY_STATUS_MAP: Record<string, string> = {
  'очікування': 'pending',
  'відмова': 'rejected',
  'співбесіда': 'interview',
  'тестове': 'test task',
  'офер': 'offer',
};

export const GMAIL_CHECK_INTERVAL_MINUTES = 5;
