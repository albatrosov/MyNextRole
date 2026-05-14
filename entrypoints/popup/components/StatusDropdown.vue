<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ResultStatus } from '@/lib/types/application';
import { RESULT_OPTIONS } from '@/lib/utils/constants';
import type { Translations } from '../composables/useI18n';

const props = defineProps<{
  rowIndex: number;
  currentStatus: ResultStatus;
  t: Translations;
}>();

const emit = defineEmits<{
  change: [payload: { rowIndex: number; status: ResultStatus }];
}>();

// Local state mirrors prop — synced via watch when parent confirms.
// Updated optimistically on change for instant color feedback.
const localStatus = ref<ResultStatus>(props.currentStatus);
watch(() => props.currentStatus, (val) => {
  localStatus.value = val;
});

function statusClass(result: string): string {
  const map: Record<string, string> = {
    'pending': 'badge--wait',
    'rejected': 'badge--rej',
    'interview': 'badge--int',
    'test task': 'badge--test',
    'offer': 'badge--off',
  };
  return map[result] || 'badge--wait';
}

function onChange(event: Event) {
  const status = (event.target as HTMLSelectElement).value as ResultStatus;
  localStatus.value = status;
  emit('change', { rowIndex: props.rowIndex, status });
}
</script>

<template>
  <select
    :value="localStatus"
    :class="['badge', statusClass(localStatus)]"
    @change="onChange"
  >
    <option v-for="option in RESULT_OPTIONS" :key="option" :value="option">
      {{ t.badges[option] }}
    </option>
  </select>
</template>
