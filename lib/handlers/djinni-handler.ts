import { BaseHandler } from './base-handler';
import type { ApplicationData } from '../types/application';

/**
 * Djinni.co flow (vacancy page URL: /jobs/<id>-slug/):
 * - Server-rendered. Job metadata is also embedded as JSON-LD
 *   (`<script type="application/ld+json">`) which is the most reliable
 *   source for title + company.
 * - "Відгукнутися на вакансію" trigger has data-analytics attribute.
 *   Clicking it reveals the hidden `#apply_form` (display:none → visible).
 * - Cover letter goes in `textarea[name="message"]`.
 * - Submit button: `#job_apply` (or `button[name="job_apply"]`).
 */
export class DjinniHandler extends BaseHandler {
  readonly siteName = 'djinni.co';
  readonly submitButtonSelector =
    '#job_apply, button[name="job_apply"], #apply_form button[type="submit"]';

  private readonly applyTriggerSelector =
    'button[data-analytics="easy_apply:show_apply_form"]';

  private submitted = false;

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
        if (btn) this.log('apply trigger clicked');
      },
      { capture: true },
    );
  }

  protected onSubmit(): void {
    if (this.submitted) return;
    this.submitted = true;
    super.onSubmit();
    // Reset after 5s in case user re-applies
    setTimeout(() => { this.submitted = false; }, 5000);
  }

  /**
   * Parse the JSON-LD JobPosting block — Djinni includes one on every
   * vacancy page with the title + hiringOrganization.name. More reliable
   * than CSS selectors because it survives DOM refactors.
   */
  private extractFromJsonLd(): { title: string; company: string } | null {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent ?? '');
        if (data['@type'] === 'JobPosting') {
          return {
            title: String(data.title ?? ''),
            company: String(data.hiringOrganization?.name ?? ''),
          };
        }
      } catch {
        // Malformed JSON-LD — try next script tag
      }
    }
    return null;
  }

  extractData(): ApplicationData | null {
    const ld = this.extractFromJsonLd();

    const role = ld?.title || this.findText([
      'h1.fs-2',
      'h1.m-0',
      '.job-post-page h1',
      'h1',
    ]);

    const company = ld?.company || this.findText([
      'a[href*="/jobs/company-"]',
      '.profile-page-section a[href*="/jobs/company-"]',
      '.fs-3 a[href*="/jobs/company-"]',
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
      '#apply_form textarea[name="message"]',
      '#apply_form #message',
      'textarea[name="message"]',
      'textarea#message',
    ]);
  }
}
