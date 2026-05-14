import { IndeedHandler } from '@/lib/handlers/indeed-handler';

// Indeed support temporarily disabled — current selectors over-trigger
// snapshot capture on any [data-jk] (search-result cards). Re-enable by
// flipping INDEED_ENABLED back to true; handler class is kept intact.
const INDEED_ENABLED = false;

export default defineContentScript({
  // .invalid TLD never resolves → script never injects while disabled.
  matches: INDEED_ENABLED ? ['*://*.indeed.com/*'] : ['*://indeed-disabled.invalid/*'],
  main() {
    if (!INDEED_ENABLED) return;
    new IndeedHandler().init();
  },
});
