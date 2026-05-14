import { ref, watch } from 'vue';

export type Theme = 'light' | 'dark';

const theme = ref<Theme>('light');
let initialized = false;

export function useTheme() {
  if (!initialized) {
    initialized = true;
    // Load persisted preference
    chrome.storage.local.get('theme', (result) => {
      if (result.theme === 'dark' || result.theme === 'light') {
        theme.value = result.theme;
      } else {
        // Respect system preference as default
        theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
    });

    // Persist on change
    watch(theme, (val) => {
      chrome.storage.local.set({ theme: val });
    });
  }

  function toggle() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  return { theme, toggle };
}
