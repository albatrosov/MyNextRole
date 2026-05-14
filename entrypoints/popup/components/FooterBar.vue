<script setup lang="ts">
import type { Translations } from '../composables/useI18n';

defineProps<{
  t: Translations;
  shown: number;
  total: number;
  syncing: boolean;
}>();
</script>

<template>
  <div class="foot">
    <div class="foot__left">
      <span v-if="syncing" class="foot__spinner" :title="t.foot.syncing" />
      <span v-else class="foot__dot" />
    </div>
    <div class="foot__right">
      {{ t.foot.shown(shown, total) }}
    </div>
  </div>
</template>
