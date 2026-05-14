import { DouHandler } from '@/lib/handlers/dou-handler';

export default defineContentScript({
  matches: ['*://*.dou.ua/*'],
  main() {
    new DouHandler().init();
  },
});
