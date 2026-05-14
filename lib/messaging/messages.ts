import type { ApplicationData, ApplicationRow, ResultStatus } from '../types/application';

export type Message =
  | { type: 'APPLICATION_SUBMITTED'; payload: ApplicationData }
  | { type: 'FETCH_APPLICATIONS' }
  | { type: 'SYNC' }
  | { type: 'OPEN_SPREADSHEET' }
  | { type: 'UPDATE_STATUS'; payload: { rowIndex: number; status: ResultStatus } }
  | { type: 'GET_AUTH_STATE' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'MARK_SEEN' };

export type MessageResponse =
  | { success: true; data?: ApplicationRow[] | boolean | string }
  | { success: false; error: string };
