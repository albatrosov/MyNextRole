import type { ApplicationData, ApplicationRow, ResultStatus } from '../types/application';
import { SHEET_NAME, SHEET_HEADERS, DEFAULT_RESULT, LEGACY_STATUS_MAP } from '../utils/constants';
import * as auth from './auth.service';
import * as storage from './storage.service';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3/files';

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.getToken(false);
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sheets API error ${response.status}: ${error}`);
  }

  return response;
}

/**
 * Search Google Drive for an existing spreadsheet with the given name.
 * Returns the most-recently-modified match, or null if none found.
 */
async function findSpreadsheetByName(name: string): Promise<string | null> {
  const escaped = name.replace(/'/g, "\\'");
  const q = `name='${escaped}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const url = `${DRIVE_BASE}?q=${encodeURIComponent(q)}&orderBy=modifiedTime desc&fields=files(id,name)&pageSize=10`;

  const response = await fetchWithAuth(url);
  const data = await response.json();
  const files = (data.files ?? []) as Array<{ id: string; name: string }>;
  return files[0]?.id ?? null;
}

/**
 * Verify a spreadsheet ID still exists and is accessible.
 * Returns true if the ID is valid, false if 404/403/etc.
 */
async function isValidSpreadsheetId(spreadsheetId: string): Promise<boolean> {
  try {
    const token = await auth.getToken(false);
    if (!token) return false;
    const response = await fetch(
      `${SHEETS_BASE}/${spreadsheetId}?fields=spreadsheetId`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function createSpreadsheet(): Promise<string> {
  const response = await fetchWithAuth(SHEETS_BASE, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: SHEET_NAME },
      sheets: [{
        properties: { title: 'Sheet1' },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: SHEET_HEADERS.map(header => ({
              userEnteredValue: { stringValue: header },
            })),
          }],
        }],
      }],
    }),
  });

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId as string;
  await storage.set('spreadsheetId', spreadsheetId);
  return spreadsheetId;
}

/**
 * Get the spreadsheet ID, resolving in this order:
 * 1. Cached in chrome.storage (validated against Drive on cache miss elsewhere)
 * 2. Search Drive for an existing spreadsheet named SHEET_NAME (handles new-device login)
 * 3. Create new spreadsheet
 */
async function getOrCreateSpreadsheetId(): Promise<string> {
  const existing = await storage.get('spreadsheetId');
  if (existing) {
    // Verify still accessible (could be deleted/revoked since last use)
    if (await isValidSpreadsheetId(existing)) return existing;
    // Stale cache — fall through to Drive search
    await storage.set('spreadsheetId', null);
  }

  // Search Drive — covers new-device login with same Google account
  const found = await findSpreadsheetByName(SHEET_NAME);
  if (found) {
    await storage.set('spreadsheetId', found);
    return found;
  }

  // No existing sheet anywhere — create new
  return createSpreadsheet();
}

export async function getSpreadsheetUrl(): Promise<string> {
  const spreadsheetId = await getOrCreateSpreadsheetId();
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * Resolve the sheetId of the first tab inside the spreadsheet. Required
 * by structural operations (insertDimension, deleteDimension, etc.).
 * For freshly-created spreadsheets it's 0, but for user-imported sheets
 * found via Drive search it could be anything.
 */
let cachedSheetId: { spreadsheetId: string; sheetId: number } | null = null;
async function getFirstSheetId(spreadsheetId: string): Promise<number> {
  if (cachedSheetId && cachedSheetId.spreadsheetId === spreadsheetId) {
    return cachedSheetId.sheetId;
  }
  const response = await fetchWithAuth(
    `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties.sheetId`,
  );
  const data = await response.json();
  const sheetId = data.sheets?.[0]?.properties?.sheetId ?? 0;
  cachedSheetId = { spreadsheetId, sheetId };
  return sheetId;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Insert a new application at the TOP of the sheet (becomes the first
 * data row, right under the header). Uses spreadsheets:batchUpdate to
 * (a) insert a blank row at row 2, shifting existing rows down, then
 * (b) populate that row with the new values — atomic in one HTTP call.
 *
 * Note: assumes the first sheet in the workbook has sheetId=0, which is
 * the default Google assigns when a spreadsheet is created.
 */
export async function appendRow(application: ApplicationData): Promise<void> {
  const spreadsheetId = await getOrCreateSpreadsheetId();
  const sheetId = await getFirstSheetId(spreadsheetId);

  const cells = [
    formatDate(application.timestamp),
    application.site,
    application.url,
    application.company,
    application.role,
    application.coverLetter,
    DEFAULT_RESULT,
  ];

  await fetchWithAuth(
    `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            // Insert a blank row at index 1 (zero-based) — i.e. position
            // immediately below the header row.
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: 1,
                endIndex: 2,
              },
              inheritFromBefore: false,
            },
          },
          {
            // Populate that newly-inserted row with the application data.
            updateCells: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 7,
              },
              fields: 'userEnteredValue',
              rows: [
                {
                  values: cells.map((value) => ({
                    userEnteredValue: { stringValue: value },
                  })),
                },
              ],
            },
          },
        ],
      }),
    },
  );
}

export async function getRows(): Promise<ApplicationRow[]> {
  const spreadsheetId = await getOrCreateSpreadsheetId();
  const range = 'Sheet1!A2:G';

  const response = await fetchWithAuth(
    `${SHEETS_BASE}/${spreadsheetId}/values/${range}`,
  );

  const data = await response.json();
  const values: string[][] = data.values ?? [];

  return values.map((row, index) => {
    const rawStatus = row[6] ?? DEFAULT_RESULT;
    // Translate legacy Ukrainian status strings to current English values
    const result = (LEGACY_STATUS_MAP[rawStatus] ?? rawStatus) as ResultStatus;
    return {
      date: row[0] ?? '',
      site: row[1] ?? '',
      url: row[2] ?? '',
      company: row[3] ?? '',
      role: row[4] ?? '',
      coverLetter: row[5] ?? '',
      result,
      rowIndex: index + 2,
      timestamp: 0,
    };
  });
}

export async function updateStatus(rowIndex: number, status: ResultStatus): Promise<void> {
  const spreadsheetId = await getOrCreateSpreadsheetId();
  const range = `Sheet1!G${rowIndex}`;

  await fetchWithAuth(
    `${SHEETS_BASE}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [[status]] }),
    },
  );
}
