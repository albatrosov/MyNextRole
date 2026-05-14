import type { ApplicationData } from '../types/application';

export abstract class BaseHandler {
  abstract readonly siteName: string;
  abstract readonly submitButtonSelector: string;

  abstract extractData(): ApplicationData | null;
  abstract detectCoverLetter(): string;

  init(): void {
    this.log('handler initialized');
    this.setupListeners();
    this.observeNavigation();
  }

  protected setupListeners(): void {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        if (target.closest(this.submitButtonSelector)) {
          this.onSubmit();
        }
      },
      { capture: true },
    );
  }

  protected observeNavigation(): void {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        this.onNavigate();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  protected onNavigate(): void {
    // Override in subclasses if needed for SPA re-init
  }

  protected onSubmit(): void {
    const data = this.extractData();
    if (data) {
      this.log('application submitted', data);
      chrome.runtime.sendMessage({ type: 'APPLICATION_SUBMITTED', payload: data });
    } else {
      this.log('submit detected but data extraction failed');
    }
  }

  /**
   * Try multiple selectors and return first matching element's trimmed text.
   * Logs which selector matched, for debugging when sites change DOM.
   */
  protected findText(selectors: string[]): string {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text) {
        this.log(`matched selector "${sel}" -> "${text.slice(0, 60)}"`);
        return text;
      }
    }
    this.log('no selector matched', selectors);
    return '';
  }

  protected findTextarea(selectors: string[]): string {
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLTextAreaElement | null;
      const value = el?.value?.trim();
      if (value) return value;
    }
    return '';
  }

  protected log(..._args: unknown[]): void {
    // No-op in production. Re-add console.log here for local debugging.
  }
}
