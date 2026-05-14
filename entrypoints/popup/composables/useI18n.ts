import { ref, computed, watch } from 'vue';

export type Lang = 'ua' | 'en';

const lang = ref<Lang>('en');
let initialized = false;

const T = {
  ua: {
    tag: 'трекер відгуків',
    refresh: 'Оновити',
    openSheet: 'Відкрити таблицю',
    exit: 'Вийти',
    signIn: 'Увійти через Google',
    signingIn: 'Авторизація...',
    statTotal: 'Всього відгуків',
    statWeek: 'Цього тижня',
    statResp: 'Відповіді',
    statConv: 'Конверсія',
    search: 'Пошук компаній, ролей…',
    filter: 'Фільтр',
    cols: { date: 'Дата', site: 'Сайт', co: 'Компанія', role: 'Роль', cl: 'CL', st: 'Результат' },
    badges: {
      'pending': 'очікування',
      'interview': 'інтерв\'ю',
      'offer': 'офер',
      'rejected': 'відмова',
      'test task': 'тестове',
    },
    empty: {
      title: 'Поки що немає відгуків',
      sub: 'Відвідайте сайт з вакансіями — відгук з\'явиться тут автоматично',
    },
    foot: {
      syncing: 'Синхронізація...',
      shown: (n: number, t: number) => `Показано ${n} з ${t}`,
      settings: 'Налаштування',
    },
    allSites: 'Всі сайти',
    allStatuses: 'Всі статуси',
    addNew: 'Додати',
    pagination: {
      pageOf: (cur: number, total: number) => `Сторінка ${cur} з ${total}`,
      prev: 'Попередня',
      next: 'Наступна',
    },
    addModal: {
      title: 'Новий відгук',
      site: 'Сайт',
      sitePh: 'Напр., work.ua',
      company: 'Компанія',
      companyPh: 'Напр., Google',
      role: 'Роль',
      rolePh: 'Напр., Senior Frontend Engineer',
      url: 'Посилання на вакансію',
      coverLetter: 'Cover letter',
      coverLetterPh: 'Текст супровідного листа (необов\'язково)',
      cancel: 'Скасувати',
      save: 'Зберегти',
      saving: 'Збереження...',
      errRequired: 'Компанія і роль обов\'язкові',
    },
  },
  en: {
    tag: 'application tracker',
    refresh: 'Refresh',
    openSheet: 'Open spreadsheet',
    exit: 'Sign out',
    signIn: 'Sign in with Google',
    signingIn: 'Signing in...',
    statTotal: 'Total applications',
    statWeek: 'This week',
    statResp: 'Responses',
    statConv: 'Response rate',
    search: 'Search companies, roles…',
    filter: 'Filter',
    cols: { date: 'Date', site: 'Source', co: 'Company', role: 'Role', cl: 'CL', st: 'Status' },
    badges: {
      'pending': 'pending',
      'interview': 'interview',
      'offer': 'offer',
      'rejected': 'rejected',
      'test task': 'test task',
    },
    empty: {
      title: 'No applications yet',
      sub: 'Visit a job site — applications will appear here automatically',
    },
    foot: {
      syncing: 'Syncing...',
      shown: (n: number, t: number) => `Showing ${n} of ${t}`,
      settings: 'Settings',
    },
    allSites: 'All sources',
    allStatuses: 'All statuses',
    addNew: 'Add',
    pagination: {
      pageOf: (cur: number, total: number) => `Page ${cur} of ${total}`,
      prev: 'Previous',
      next: 'Next',
    },
    addModal: {
      title: 'New application',
      site: 'Source',
      sitePh: 'e.g., linkedin.com',
      company: 'Company',
      companyPh: 'e.g., Google',
      role: 'Role',
      rolePh: 'e.g., Senior Frontend Engineer',
      url: 'Job URL',
      coverLetter: 'Cover letter',
      coverLetterPh: 'Cover letter text (optional)',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      errRequired: 'Company and role are required',
    },
  },
} as const;

export type Translations = typeof T['ua'];

export function useI18n() {
  if (!initialized) {
    initialized = true;
    chrome.storage.local.get('lang', (result) => {
      if (result.lang === 'ua' || result.lang === 'en') {
        lang.value = result.lang;
      }
    });
    watch(lang, (val) => {
      chrome.storage.local.set({ lang: val });
    });
  }

  const t = computed(() => T[lang.value]);

  function toggle() {
    lang.value = lang.value === 'ua' ? 'en' : 'ua';
  }

  return { lang, t, toggle };
}
