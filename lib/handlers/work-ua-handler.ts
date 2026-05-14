import { BaseHandler } from './base-handler';
import type { ApplicationData } from '../types/application';

export class WorkUaHandler extends BaseHandler {
  readonly siteName = 'work.ua';

  // "Відгукнутися" button opens a React modal for sending resume.
  // We watch for TWO events:
  // 1. Click on the initial "Відгукнутися" button (data-open-react-send-resume-modal)
  // 2. Actual form submission inside the modal (the real send action)
  readonly submitButtonSelector = '[data-open-react-send-resume-modal]';

  private modalObserver: MutationObserver | null = null;
  private submitted = false;

  init(): void {
    // Don't use base setupListeners — we need custom modal tracking logic
    this.watchForApplyButton();
    this.observeNavigation();
  }

  /**
   * Work.ua flow:
   * 1. User clicks "Відгукнутися" → React modal opens
   * 2. Modal has textarea for cover letter + "Надіслати" button
   * 3. We intercept the actual send inside the modal
   */
  private watchForApplyButton(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const applyBtn = target.closest('[data-open-react-send-resume-modal]');
      if (applyBtn) {
        // Modal will open — start observing DOM for it
        this.waitForModal();
      }
    }, { capture: true });
  }

  private waitForModal(): void {
    // Clean up previous observer if any
    this.modalObserver?.disconnect();

    this.modalObserver = new MutationObserver(() => {
      // Look for the React modal container
      const modal = document.querySelector('[class*="modal"][class*="show"], [role="dialog"], .ReactModal__Content');
      if (!modal) return;

      // Found modal — now watch for submit button inside it
      this.attachModalSubmitListener(modal);
      this.modalObserver?.disconnect();
    });

    this.modalObserver.observe(document.body, { childList: true, subtree: true });

    // Timeout cleanup — modal should appear within 5 seconds
    setTimeout(() => this.modalObserver?.disconnect(), 5000);
  }

  private attachModalSubmitListener(modal: Element): void {
    // Watch for clicks on send/submit buttons inside the modal
    // Work.ua modal buttons: "Надіслати", "Відправити", submit buttons
    modal.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const btn = target.closest('button');
      if (!btn) return;

      const text = btn.textContent?.trim().toLowerCase() ?? '';
      const isSubmit = (
        text.includes('надіслати') ||
        text.includes('відправити') ||
        text.includes('send') ||
        btn.type === 'submit'
      );

      if (isSubmit && !this.submitted) {
        this.submitted = true;
        this.onSubmit();
      }
    }, { capture: true });

    // Also watch for modal closing (success indicator — modal disappears after send)
    this.watchModalClose(modal);
  }

  private watchModalClose(modal: Element): void {
    const observer = new MutationObserver(() => {
      // If modal is removed from DOM or hidden, application was likely sent
      if (!document.contains(modal) || (modal as HTMLElement).style.display === 'none') {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 120000);
  }

  extractData(): ApplicationData | null {
    // Company: <a href="/jobs/by-company/..."><span class="strong-500">Company Name</span></a>
    const companyLink = document.querySelector('a[href*="/jobs/by-company/"] .strong-500');
    const companyImg = document.querySelector('a.logo-company img') as HTMLImageElement | null;
    const company = companyLink?.textContent?.trim()
      ?? companyImg?.alt?.trim()
      ?? '';

    // Job title: <h1 id="h1-name">...</h1>
    const role = document.querySelector('h1#h1-name')?.textContent?.trim() ?? '';

    if (!company || !role) return null;

    return {
      site: this.siteName,
      url: location.href,
      company,
      role,
      coverLetter: this.detectCoverLetter(),
      timestamp: Date.now(),
    };
  }

  detectCoverLetter(): string {
    // Check for cover letter textarea in the modal
    const textareas = document.querySelectorAll('textarea');
    for (const textarea of textareas) {
      const text = textarea.value?.trim() ?? '';
      if (text.length > 0) return text;
    }
    return '';
  }
}
