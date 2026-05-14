import { DjinniHandler } from '@/lib/handlers/djinni-handler';

export default defineContentScript({
  matches: ['*://*.djinni.co/*'],
  main() {
    new DjinniHandler().init();
  },
});
