import { LinkedInHandler } from '@/lib/handlers/linkedin-handler';

export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  main() {
    new LinkedInHandler().init();
  },
});
