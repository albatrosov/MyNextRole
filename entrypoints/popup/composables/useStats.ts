import { computed, type Ref } from 'vue';
import type { ApplicationRow } from '@/lib/types/application';

export interface Stats {
  total: number;
  week: number;
  responses: number;
  conversionRate: number;
  weekDelta: number | null;
  convDelta: number | null;
}

// JS getDay(): 0=Sun..6=Sat. Treat Sunday as the last day of the previous
// week so Sunday rolls into the same Mon..Sun window as Saturday.
function startOfWeek(now: Date): Date {
  const day = now.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + offsetToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isThisWeek(dateStr: string): boolean {
  // dateStr format: "DD.MM.YYYY"
  const [d, m, y] = dateStr.split('.').map(Number);
  const date = new Date(y, m - 1, d);
  return date >= startOfWeek(new Date());
}

function isLastWeek(dateStr: string): boolean {
  const [d, m, y] = dateStr.split('.').map(Number);
  const date = new Date(y, m - 1, d);
  const thisWeek = startOfWeek(new Date());
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(thisWeek.getDate() - 7);
  return date >= lastWeek && date < thisWeek;
}

export function useStats(applications: Ref<ApplicationRow[]>) {
  const stats = computed<Stats>(() => {
    const all = applications.value;
    const total = all.length;
    const week = all.filter((a) => isThisWeek(a.date)).length;
    const lastWeek = all.filter((a) => isLastWeek(a.date)).length;
    const responses = all.filter((a) => a.result !== 'pending').length;
    const conversionRate = total > 0 ? Math.round((responses / total) * 100) : 0;

    // Delta: difference vs last week
    const weekDelta = lastWeek > 0 ? week - lastWeek : null;

    // Conv delta: not easily computed without historical data, skip
    const convDelta = null;

    return { total, week, responses, conversionRate, weekDelta, convDelta };
  });

  return { stats };
}
