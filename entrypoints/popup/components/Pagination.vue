<script setup lang="ts">
import { computed } from 'vue';
import type { Translations } from '../composables/useI18n';

const props = defineProps<{
  currentPage: number;
  totalPages: number;
  t: Translations;
}>();

const emit = defineEmits<{
  goTo: [page: number];
  next: [];
  prev: [];
}>();

// Build list of visible page numbers with ellipsis for compact UI
// Show: first, last, current ± 1, and ellipsis where gaps exist
const visiblePages = computed<(number | '...')[]>(() => {
  const total = props.totalPages;
  const current = props.currentPage;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | '...')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }
  return result;
});

const isFirst = computed(() => props.currentPage <= 1);
const isLast = computed(() => props.currentPage >= props.totalPages);
</script>

<template>
  <div class="pagination">
    <span class="pagination__info">
      {{ t.pagination.pageOf(currentPage, totalPages) }}
    </span>
    <div class="pagination__controls">
      <button
        class="pagination__btn"
        :disabled="isFirst"
        :title="t.pagination.prev"
        @click="emit('prev')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button
        v-for="(p, i) in visiblePages"
        :key="`${p}-${i}`"
        class="pagination__btn pagination__btn--num"
        :class="{ 'pagination__btn--active': p === currentPage }"
        :disabled="p === '...'"
        @click="typeof p === 'number' && emit('goTo', p)"
      >
        {{ p }}
      </button>
      <button
        class="pagination__btn"
        :disabled="isLast"
        :title="t.pagination.next"
        @click="emit('next')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  </div>
</template>
