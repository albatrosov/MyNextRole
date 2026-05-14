import { ref, computed, type Ref } from 'vue';
import type { ApplicationRow, ResultStatus } from '@/lib/types/application';

export function useFilters(applications: Ref<ApplicationRow[]>) {
  const searchQuery = ref('');
  const siteFilter = ref<string>('');
  const statusFilter = ref<ResultStatus | ''>('');

  const uniqueSites = computed(() => {
    const sites = new Set(applications.value.map((a) => a.site));
    return Array.from(sites).sort();
  });

  const filtered = computed(() => {
    let result = applications.value;

    // Search by company or role
    const q = searchQuery.value.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q),
      );
    }

    // Site filter
    if (siteFilter.value) {
      result = result.filter((a) => a.site === siteFilter.value);
    }

    // Status filter
    if (statusFilter.value) {
      result = result.filter((a) => a.result === statusFilter.value);
    }

    return result;
  });

  function clearFilters() {
    searchQuery.value = '';
    siteFilter.value = '';
    statusFilter.value = '';
  }

  const hasActiveFilters = computed(
    () => !!searchQuery.value || !!siteFilter.value || !!statusFilter.value,
  );

  return {
    searchQuery,
    siteFilter,
    statusFilter,
    uniqueSites,
    filtered,
    clearFilters,
    hasActiveFilters,
  };
}
