export type ResultStatus = 'pending' | 'rejected' | 'interview' | 'test task' | 'offer';

export interface ApplicationData {
  site: string;
  url: string;
  company: string;
  role: string;
  coverLetter: string;
  timestamp: number;
}

export interface ApplicationRow extends ApplicationData {
  date: string;
  result: ResultStatus;
  rowIndex: number;
}
