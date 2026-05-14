<script setup lang="ts">
import type { ApplicationRow, ResultStatus } from '@/lib/types/application';
import type { Translations } from '../composables/useI18n';
import StatusDropdown from './StatusDropdown.vue';

defineProps<{
  applications: ApplicationRow[];
  t: Translations;
}>();

const emit = defineEmits<{
  statusChange: [payload: { rowIndex: number; status: ResultStatus }];
}>();

const PALETTE = ['#0EA5E9', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

function favColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(s: string): string {
  const parts = s.replace(/[.,]/g, '').split(' ').filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

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

</script>

<template>
  <table class="tbl">
    <thead>
      <tr>
        <th>{{ t.cols.date }}</th>
        <th>{{ t.cols.site }}</th>
        <th>{{ t.cols.co }}</th>
        <th>{{ t.cols.role }}</th>
        <th style="text-align: center">{{ t.cols.cl }}</th>
        <th>{{ t.cols.st }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="app in applications" :key="app.rowIndex">
        <td class="cell-date">{{ app.date }}</td>
        <td class="cell-site">{{ app.site }}</td>
        <td>
          <div class="cell-company">
            <span class="fav" :style="{ background: favColor(app.company) }">
              {{ initials(app.company) }}
            </span>
            <a :href="app.url" target="_blank" rel="noopener noreferrer">{{ app.company }}</a>
          </div>
        </td>
        <td class="cell-role">{{ app.role }}</td>
        <td class="cell-cl">
          <span v-if="app.coverLetter" class="cl-yes" :title="app.coverLetter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m4 12 5 5L20 6" /></svg>
          </span>
          <span v-else class="cl-no">—</span>
        </td>
        <td>
          <StatusDropdown
            :row-index="app.rowIndex"
            :current-status="app.result"
            :t="t"
            @change="emit('statusChange', $event)"
          />
        </td>
      </tr>
    </tbody>
  </table>
</template>
