import { BaseHandler } from './base-handler';
import type { ApplicationData } from '../types/application';

/**
 * LinkedIn Easy Apply flow:
 * - React SPA — URL pattern: /jobs/view/<id>/ or /jobs/collections/.../?currentJobId=<id>
 * - Click "Easy Apply" button → modal opens (.artdeco-modal with class jobs-easy-apply-modal)
 * - Multi-step form: Next → Next → Review → Submit application
 * - Final button has aria-label="Submit application"
 * - After submit: modal shows "Application sent" success state, then closes
 *
 * Note: "Apply on company site" buttons go external — NOT tracked.
 */
export class LinkedInHandler extends BaseHandler {
  readonly siteName = 'linkedin.com';

  // Only the Easy Apply submit button — last step in modal
  readonly submitButtonSelector =
    'button[aria-label="Submit application"], ' +
    'button[data-live-test-easy-apply-submit-button], ' +
    '.jobs-easy-apply-modal button[type="submit"][aria-label*="Submit"]';

  private readonly easyApplyTriggerSelector =
    'button.jobs-apply-button[aria-label*="Easy Apply"], ' +
    'button.jobs-apply-button--top-card, ' +
    '.jobs-apply-button:not([aria-label*="company"])';

  private submitted = false;
  private modalObserver: MutationObserver | null = null;

  init(): void {
    this.log('handler initialized');
    this.observeNavigation();
    this.watchForEasyApply();
    this.setupListeners();
  }

  protected onNavigate(): void {
    this.submitted = false;
    this.log('navigated to', location.href);
  }

  private watchForEasyApply(): void {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        const btn = target.closest(this.easyApplyTriggerSelector) as HTMLButtonElement | null;
        if (!btn) return;

        const label = btn.getAttribute('aria-label') ?? btn.textContent ?? '';
        if (label.toLowerCase().includes('easy apply')) {
          this.log('Easy Apply button clicked');
          this.waitForModal();
        } else {
          this.log('apply button is external (not Easy Apply), skipping');
        }
      },
      { capture: true },
    );
  }

  private waitForModal(): void {
    this.modalObserver?.disconnect();

    const checkForModal = () => {
      const modal = document.querySelector(
        '.jobs-easy-apply-modal, .artdeco-modal[role="dialog"][aria-labelledby*="apply"]',
      );
      if (modal) {
        this.log('Easy Apply modal opened');
        this.modalObserver?.disconnect();
      }
    };

    this.modalObserver = new MutationObserver(checkForModal);
    this.modalObserver.observe(document.body, { childList: true, subtree: true });
    checkForModal();
    setTimeout(() => this.modalObserver?.disconnect(), 10000);
  }

  protected onSubmit(): void {
    if (this.submitted) return;
    this.submitted = true;
    super.onSubmit();
    setTimeout(() => { this.submitted = false; }, 5000);
  }

  extractData(): ApplicationData | null {
    const company = this.findText([
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.jobs-details-top-card__company-url',
      '.topcard__org-name-link',
    ]);

    const role = this.findText([
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '.topcard__title',
      'h1.t-24',
      'h1',
    ]);

    if (!company || !role) {
      this.log('extraction failed', { company, role });
      return null;
    }

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
    // LinkedIn Easy Apply rarely has explicit cover letter field — usually
    // free-form "Additional questions" textarea. Capture anything in the modal.
    return this.findTextarea([
      '.jobs-easy-apply-modal textarea[id*="cover"]',
      '.jobs-easy-apply-modal textarea[id*="letter"]',
      '.jobs-easy-apply-modal textarea',
      'textarea[name*="cover"]',
      'textarea[aria-label*="cover"]',
    ]);
  }
}
