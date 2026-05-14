import { ref, computed, watch, type Ref } from 'vue';
import { PAGE_SIZE } from '@/lib/utils/constants';

export function usePagination<T>(items: Ref<T[]>, pageSize = PAGE_SIZE) {
  const currentPage = ref(1);

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(items.value.length / pageSize)),
  );

  // Clamp current page when items shrink (e.g. filter applied)
  watch(totalPages, (total) => {
    if (currentPage.value > total) currentPage.value = total;
  });

  const paginated = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return items.value.slice(start, start + pageSize);
  });

  function goTo(page: number) {
    currentPage.value = Math.min(Math.max(1, page), totalPages.value);
  }
  function next() { goTo(currentPage.value + 1); }
  function prev() { goTo(currentPage.value - 1); }
  function reset() { currentPage.value = 1; }

  return {
    currentPage,
    totalPages,
    paginated,
    pageSize,
    goTo,
    next,
    prev,
    reset,
  };
}
