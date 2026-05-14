import { BaseHandler } from './base-handler';
import type { ApplicationData } from '../types/application';

/**
 * Indeed flow:
 * - Vacancy page: /viewjob?jk=<id> or main page with `?vjk=<id>`
 * - Apply button opens iframe to smartapply.indeed.com — submission happens there
 * - After submission, parent page (indeed.com) updates UI:
 *   - Button changes to "Applied" / disabled
 *   - Banner appears: "You've applied to this job"
 *
 * Strategy: capture data snapshot on apply click, then watch parent DOM
 * for "Applied" state change. Avoids cross-origin iframe complexity.
 *
 * "Apply on company site" → external, NOT tracked.
 */
export class IndeedHandler extends BaseHandler {
  readonly siteName = 'indeed.com';

  // Not used directly — we override submission detection via state-change observer
  readonly submitButtonSelector =
    '#indeedApplyButton button, ' +
    '#ia-IndeedApplyButton button, ' +
    'button[data-jk]';

  private readonly applyTriggerSelector =
    'button[aria-label*="Apply now"], ' +
    'button[id*="indeedApply"], ' +
    'button[id*="ia-IndeedApply"], ' +
    'button.ia-IndeedApplyButton, ' +
    'button.indeed-apply-button, ' +
    'button[data-jk]';

  private snapshot: ApplicationData | null = null;
  private appliedObserver: MutationObserver | null = null;
  private submitted = false;

  init(): void {
    this.log('handler initialized');
    this.observeNavigation();
    this.watchForApplyClick();
  }

  protected onNavigate(): void {
    this.snapshot = null;
    this.submitted = false;
    this.appliedObserver?.disconnect();
    this.log('navigated to', location.href);
  }

  private watchForApplyClick(): void {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        const btn = target.closest(this.applyTriggerSelector);
        if (!btn) return;

        const label =
          (btn.getAttribute('aria-label') ?? '') + ' ' + (btn.textContent ?? '');
        const lower = label.toLowerCase();

        // Skip "Apply on company site" — those go external
        if (lower.includes('company site') || lower.includes('external')) {
          this.log('external apply, skipping');
          return;
        }

        // Only trigger for Indeed Apply path
        if (lower.includes('apply') || btn.id.includes('indeedApply')) {
          this.log('Indeed Apply clicked, capturing snapshot');
          this.snapshot = this.extractData();
          this.watchForAppliedState();
        }
      },
      { capture: true },
    );
  }

  /**
   * After Indeed Apply iframe submits, parent page renders an "Applied"
   * indicator. Watch for it and fire the submission event.
   */
  private watchForAppliedState(): void {
    this.appliedObserver?.disconnect();

    const checkApplied = (): boolean => {
      // Various indicators Indeed uses post-application
      const indicators = [
        '[data-testid="post-apply-bottom"]',
        '[data-testid*="applied"]',
        '.css-applied, .applied-badge',
        'button[aria-label*="Applied"]',
      ];
      for (const sel of indicators) {
        if (document.querySelector(sel)) {
          this.log(`applied indicator matched: ${sel}`);
          return true;
        }
      }
      // Also check for text "You've applied" / "Already applied" / "Applied"
      const bodyText = document.body.innerText;
      if (
        /you'?ve applied|already applied|application submitted/i.test(bodyText)
      ) {
        this.log('applied indicator matched via body text');
        return true;
      }
      return false;
    };

    const onApplied = () => {
      if (this.submitted) return;
      this.submitted = true;
      this.appliedObserver?.disconnect();

      const data = this.snapshot ?? this.extractData();
      if (data) {
        this.log('application submitted', data);
        chrome.runtime.sendMessage({ type: 'APPLICATION_SUBMITTED', payload: data });
      } else {
        this.log('applied state detected but data extraction failed');
      }
    };

    this.appliedObserver = new MutationObserver(() => {
      if (checkApplied()) onApplied();
    });
    this.appliedObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'class', 'data-testid'],
    });

    // Stop watching after 5 min (user closed iframe / abandoned)
    setTimeout(() => this.appliedObserver?.disconnect(), 5 * 60 * 1000);
  }

  extractData(): ApplicationData | null {
    const company = this.findText([
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader',
      '.jobsearch-CompanyInfoContainer a',
      'a[data-tn-element="companyName"]',
    ]);

    const role = this.findText([
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      '.jobsearch-JobInfoHeader-title span',
      '.jobsearch-JobInfoHeader-title',
      'h1.jobsearch-JobInfoHeader-title',
      'h1.jobTitle',
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
      coverLetter: '', // Cover letter lives inside iframe — inaccessible cross-origin
      timestamp: Date.now(),
    };
  }

  detectCoverLetter(): string {
    // smartapply.indeed.com iframe is cross-origin — can't read it from here
    return '';
  }
}
