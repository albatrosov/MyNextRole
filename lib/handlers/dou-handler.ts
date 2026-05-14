import { BaseHandler } from './base-handler';
import type { ApplicationData } from '../types/application';

/**
 * DOU.ua apply flow (real, observed):
 * - Vacancy page is server-rendered. Logged-in user sees an inline
 *   "Відгукнутися" link: `<a id="reply-btn-id">` (NOT a hash link).
 * - Clicking it reveals an inline form (not a modal):
 *     <form id="replied-id" name="reply-form" class="replied">
 *       <textarea name="descr" id="reply_descr">...</textarea>
 *       <input type="file" name="user_cv">
 *       <button class="replied-btn send">Відправити</button>
 *     </form>
 * - Submit button: `button.replied-btn.send` (no type="submit" attr but
 *   inside a <form> so click triggers form submission).
 */
export class DouHandler extends BaseHandler {
  readonly siteName = 'dou.ua';

  // Real DOU submit selectors (observed via DevTools)
  readonly submitButtonSelector =
    'button.replied-btn.send, ' +
    'form#replied-id button.send, ' +
    'form[name="reply-form"] button.send, ' +
    '.replied button.send';

  private submitted = false;

  init(): void {
    this.log('handler initialized');
    this.observeNavigation();
    this.watchForApplyTrigger();
    this.setupListeners();
    this.observeFormSubmit();
    this.observeSuccessMessage();
  }

  /**
   * "Відгукнутися" link — opens the inline form. Just log it for
   * debugging; the form is then handled by the global submit listeners.
   */
  private watchForApplyTrigger(): void {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        const link = target.closest(
          '#reply-btn-id, #relogin-link, a[href*="#apply"]',
        );
        if (link) this.log('apply trigger clicked');
      },
      { capture: true },
    );
  }

  /**
   * Document-level submit listener — catches form submission regardless
   * of HOW it was triggered (button click, Enter key, programmatic).
   */
  private observeFormSubmit(): void {
    document.addEventListener(
      'submit',
      (event) => {
        const form = event.target as HTMLFormElement | null;
        if (!form) return;

        const isReplyForm =
          form.id === 'replied-id' ||
          form.getAttribute('name') === 'reply-form' ||
          form.classList.contains('replied') ||
          /apply/.test(form.getAttribute('action') ?? '');

        if (isReplyForm) {
          this.log('reply form submit detected', {
            id: form.id,
            name: form.getAttribute('name'),
            cls: form.className,
          });
          this.onSubmit();
        }
      },
      { capture: true },
    );
  }

  /**
   * Fallback: success text appears after submit. Last-resort detector.
   */
  private observeSuccessMessage(): void {
    let seen = false;
    const observer = new MutationObserver(() => {
      if (seen) return;
      const text = document.body.innerText;
      if (/Дякуємо за відгук|Ви вже відгукнул|Резюме надіслано/i.test(text)) {
        seen = true;
        this.log('success message detected');
        this.onSubmit();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  protected onSubmit(): void {
    if (this.submitted) return;
    this.submitted = true;
    super.onSubmit();
    setTimeout(() => { this.submitted = false; }, 5000);
  }

  extractData(): ApplicationData | null {
    const company = this.findText([
      '.b-compinfo .info .l-n a',
      '.b-compinfo a[href*="/companies/"]',
      'a[href*="/companies/"][href*="/vacancies/"] strong',
      '.b-vacancy .company',
    ]);

    const role = this.findText([
      '.b-vacancy h1.g-h2',
      'h1.g-h2',
      '.b-vacancy h1',
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
      'form#replied-id textarea[name="descr"]',
      'form[name="reply-form"] textarea',
      '.replied textarea',
      'textarea#reply_descr',
      'textarea[name="descr"]',
    ]);
  }
}
