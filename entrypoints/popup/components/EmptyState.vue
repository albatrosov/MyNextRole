<script setup lang="ts">
import type { Translations } from '../composables/useI18n';

defineProps<{
  t: Translations;
}>();
</script>

<template>
  <div class="empty-state">
    <p class="empty-state__title">{{ t.empty.title }}</p>
    <p class="empty-state__sub">{{ t.empty.sub }}</p>
  </div>
</template>
