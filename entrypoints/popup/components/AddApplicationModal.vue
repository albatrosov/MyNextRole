<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ApplicationData } from '@/lib/types/application';
import type { Translations } from '../composables/useI18n';

const props = defineProps<{
  open: boolean;
  t: Translations;
}>();

const emit = defineEmits<{
  close: [];
  add: [payload: ApplicationData];
}>();

const site = ref('');
const url = ref('');
const company = ref('');
const role = ref('');
const coverLetter = ref('');
const error = ref('');

function reset() {
  site.value = '';
  url.value = '';
  company.value = '';
  role.value = '';
  coverLetter.value = '';
  error.value = '';
}

watch(() => props.open, (val) => {
  if (val) reset();
});

function onClose() {
  emit('close');
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) onClose();
}

function onSubmit() {
  error.value = '';
  if (!company.value.trim() || !role.value.trim()) {
    error.value = props.t.addModal.errRequired;
    return;
  }

  // Optimistic add — parent updates local state immediately, background syncs.
  emit('add', {
    site: site.value.trim(),
    url: url.value.trim(),
    company: company.value.trim(),
    role: role.value.trim(),
    coverLetter: coverLetter.value.trim(),
    timestamp: Date.now(),
  });
  emit('close');
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click="onBackdrop">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h2 class="modal__title">{{ t.addModal.title }}</h2>
        <button class="icon-btn" @click="onClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form class="modal__body" @submit.prevent="onSubmit">
        <div class="form-row">
          <label class="form-label">{{ t.addModal.site }}</label>
          <input v-model="site" class="form-input" type="text" :placeholder="t.addModal.sitePh" />
        </div>

        <div class="form-row">
          <label class="form-label">{{ t.addModal.company }} <span class="required">*</span></label>
          <input v-model="company" class="form-input" type="text" :placeholder="t.addModal.companyPh" autofocus />
        </div>

        <div class="form-row">
          <label class="form-label">{{ t.addModal.role }} <span class="required">*</span></label>
          <input v-model="role" class="form-input" type="text" :placeholder="t.addModal.rolePh" />
        </div>

        <div class="form-row">
          <label class="form-label">{{ t.addModal.url }}</label>
          <input v-model="url" class="form-input" type="url" placeholder="https://..." />
        </div>

        <div class="form-row">
          <label class="form-label">{{ t.addModal.coverLetter }}</label>
          <textarea v-model="coverLetter" class="form-input form-textarea" rows="3" :placeholder="t.addModal.coverLetterPh" />
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <div class="modal__footer">
          <button type="button" class="btn-ghost" @click="onClose">
            {{ t.addModal.cancel }}
          </button>
          <button type="submit" class="btn-primary">
            {{ t.addModal.save }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
