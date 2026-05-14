<script setup lang="ts">
import type { Stats } from '../composables/useStats';
import type { Translations } from '../composables/useI18n';

defineProps<{
  stats: Stats;
  t: Translations;
}>();
</script>

<template>
  <div class="stats">
    <div class="stat stat--featured">
      <div class="stat__label">{{ t.statTotal }}</div>
      <div class="stat__value">
        {{ stats.total }}
        <span v-if="stats.weekDelta !== null && stats.weekDelta > 0" class="stat__delta">
          +{{ stats.weekDelta }}
        </span>
      </div>
    </div>
    <div class="stat">
      <div class="stat__label">{{ t.statWeek }}</div>
      <div class="stat__value">{{ stats.week }}</div>
      <div class="stat__bar">
        <div
          class="stat__bar-fill"
          :style="{ width: stats.total ? `${(stats.week / stats.total) * 100}%` : '0%' }"
        />
      </div>
    </div>
    <div class="stat">
      <div class="stat__label">{{ t.statResp }}</div>
      <div class="stat__value">{{ stats.responses }}</div>
      <div class="stat__bar">
        <div
          class="stat__bar-fill"
          :style="{ width: stats.total ? `${(stats.responses / stats.total) * 100}%` : '0%' }"
        />
      </div>
    </div>
    <div class="stat">
      <div class="stat__label">{{ t.statConv }}</div>
      <div class="stat__value">
        {{ stats.conversionRate }}%
        <span v-if="stats.convDelta !== null" class="stat__delta" :class="{ 'stat__delta--neg': stats.convDelta < 0 }">
          {{ stats.convDelta > 0 ? '+' : '' }}{{ stats.convDelta }}%
        </span>
      </div>
    </div>
  </div>
</template>
