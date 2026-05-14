import { RobotaHandler } from '@/lib/handlers/robota-handler';

export default defineContentScript({
  matches: ['*://*.robota.ua/*'],
  main() {
    new RobotaHandler().init();
  },
});
