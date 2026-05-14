<script setup lang="ts">
import type { ResultStatus } from '@/lib/types/application';
import { RESULT_OPTIONS } from '@/lib/utils/constants';
import type { Translations } from '../composables/useI18n';

defineProps<{
  t: Translations;
  sites: string[];
  siteFilter: string;
  statusFilter: ResultStatus | '';
}>();

defineEmits<{
  'update:siteFilter': [value: string];
  'update:statusFilter': [value: ResultStatus | ''];
}>();
</script>

<template>
  <div class="filter-bar">
    <select
      class="chip"
      :value="siteFilter"
      @change="$emit('update:siteFilter', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ t.allSites }}</option>
      <option v-for="site in sites" :key="site" :value="site">{{ site }}</option>
    </select>
    <select
      class="chip"
      :value="statusFilter"
      @change="$emit('update:statusFilter', ($event.target as HTMLSelectElement).value as ResultStatus | '')"
    >
      <option value="">{{ t.allStatuses }}</option>
      <option v-for="status in RESULT_OPTIONS" :key="status" :value="status">
        {{ t.badges[status] }}
      </option>
    </select>
  </div>
</template>
