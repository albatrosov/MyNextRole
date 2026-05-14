import { WorkUaHandler } from '@/lib/handlers/work-ua-handler';

export default defineContentScript({
  matches: ['*://*.work.ua/jobs/*'],
  runAt: 'document_idle',
  main() {
    new WorkUaHandler().init();
  },
});
