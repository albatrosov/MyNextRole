import { BaseHandler } from './base-handler';
import type { ApplicationData } from '../types/application';

/**
 * Robota.ua flow:
 * - Angular SPA (santa-* design system components)
 * - Vacancy page URL: /company<id>/vacancy<id>
 * - "Відгукнутись" button opens a side panel / modal with cover letter form
 * - Submit POSTs to internal API, panel closes, "Ви вже відгукнулись" status appears
 *
 * Strategy: capture clicks on apply buttons (multiple variants), then watch
 * for submission button inside the opened panel.
 */
export class RobotaHandler extends BaseHandler {
  readonly siteName = 'robota.ua';

  // Initial "apply" button on vacancy page
  private readonly applyTriggerSelector =
    '[data-id="apply-with-prof-resume"], ' +
    '[data-id="apply-button"], ' +
    'button.alterkit-apply-button, ' +
    'button.apply-button, ' +
    'a[href*="apply"]';

  // Submission button inside the apply form/modal
  readonly submitButtonSelector =
    '[data-id="apply_message_send"], ' +
    '[data-id="send-cv"], ' +
    'alliance-apply-message button[type="submit"], ' +
    'alliance-apply-form button[type="submit"], ' +
    'button.santa-bg-orange:not([disabled])';

  private submitted = false;
  private panelObserver: MutationObserver | null = null;

  init(): void {
    this.log('handler initialized');
    this.observeNavigation();
    this.watchForApplyTrigger();
    this.setupListeners();
  }

  protected onNavigate(): void {
    this.submitted = false;
    this.log('navigated to', location.href);
  }

  private watchForApplyTrigger(): void {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        const btn = target.closest(this.applyTriggerSelector);
        if (!btn) return;

        // Also check button text as fallback
        const text = btn.textContent?.trim().toLowerCase() ?? '';
        const isApply =
          text.includes('відгукнутись') ||
          text.includes('відгукнутися') ||
          text.includes('apply') ||
          btn.matches(this.applyTriggerSelector);

        if (isApply) {
          this.log('apply trigger clicked');
          this.waitForPanel();
        }
      },
      { capture: true },
    );
  }

  private waitForPanel(): void {
    this.panelObserver?.disconnect();

    const checkForPanel = () => {
      const panel = document.querySelector(
        'alliance-apply-message, alliance-apply-form, [data-id="apply-form"], ' +
          '.santa-modal, [class*="apply"][class*="modal"]',
      );
      if (panel) {
        this.log('apply panel found');
        this.panelObserver?.disconnect();
      }
    };

    this.panelObserver = new MutationObserver(checkForPanel);
    this.panelObserver.observe(document.body, { childList: true, subtree: true });
    checkForPanel();
    setTimeout(() => this.panelObserver?.disconnect(), 10000);
  }

  protected onSubmit(): void {
    if (this.submitted) return;
    this.submitted = true;
    super.onSubmit();
    setTimeout(() => { this.submitted = false; }, 5000);
  }

  extractData(): ApplicationData | null {
    const company = this.findText([
      '[data-id="company-name"]',
      'a[data-id="company-name-link"]',
      '.santa-company-name',
      'a[href*="/company"][href*="vacancies"]',
      'h2[data-id="company-name"]',
    ]);

    const role = this.findText([
      'h1[data-id="vacancy-title"]',
      '[data-id="vacancy-title"]',
      'h1.santa-typo-secondary-h1',
      'h1.santa-typo-h3',
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
    return this.findTextarea([
      '[data-id="cover-letter"]',
      '[data-id="apply-message"] textarea',
      'alliance-apply-message textarea',
      'textarea[formcontrolname*="message"]',
      'textarea[placeholder*="супровідн"]',
      'textarea',
    ]);
  }
}
