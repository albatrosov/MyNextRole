import type { ApplicationData } from './application';

export interface SiteHandler {
  readonly siteName: string;
  readonly submitButtonSelector: string;
  init(): void;
  extractData(): ApplicationData | null;
  detectCoverLetter(): string;
}
