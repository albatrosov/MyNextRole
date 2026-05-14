<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { sendMessage } from '@/lib/messaging/bridge';
import type { ApplicationData, ResultStatus } from '@/lib/types/application';
import { useTheme } from './composables/useTheme';
import { useI18n } from './composables/useI18n';
import { useStats } from './composables/useStats';
import { useFilters } from './composables/useFilters';
import { usePagination } from './composables/usePagination';
import { useApplications } from './composables/useApplications';
import LogoIcon from './components/LogoIcon.vue';
import StatsRow from './components/StatsRow.vue';
import SearchBar from './components/SearchBar.vue';
import FilterBar from './components/FilterBar.vue';
import FooterBar from './components/FooterBar.vue';
import ApplicationsTable from './components/ApplicationsTable.vue';
import EmptyState from './components/EmptyState.vue';
import AddApplicationModal from './components/AddApplicationModal.vue';
import Pagination from './components/Pagination.vue';

const { theme, toggle: toggleTheme } = useTheme();
const { t, lang, toggle: toggleLang } = useI18n();

const {
  applications,
  loaded,
  syncing,
  sync,
  updateStatus,
  addApplication,
  clear: clearApplications,
} = useApplications();

const isAuthenticated = ref(false);
const authChecked = ref(false);
const signingIn = ref(false);
const openingSheet = ref(false);
const showAddModal = ref(false);
const error = ref('');

const { stats } = useStats(applications);
const { searchQuery, siteFilter, statusFilter, uniqueSites, filtered } =
  useFilters(applications);
const { currentPage, totalPages, paginated, goTo, next, prev, reset: resetPage } =
  usePagination(filtered);

// Show spinner only when we have no local data yet AND we're authenticated.
// Otherwise render the table immediately from chrome.storage.
const showInitialLoader = computed(
  () => isAuthenticated.value && !loaded.value,
);

watch([searchQuery, siteFilter, statusFilter], () => resetPage());

onMounted(async () => {
  const authResponse = await sendMessage({ type: 'GET_AUTH_STATE' });
  if (authResponse.success && authResponse.data) {
    isAuthenticated.value = true;
    // Clear unseen-updates badge — user is looking at the popup now
    sendMessage({ type: 'MARK_SEEN' });
    // Trigger background sync — does not block UI
    sync();
  }
  authChecked.value = true;
});

async function onSignIn() {
  signingIn.value = true;
  try {
    const response = await sendMessage({ type: 'SIGN_IN' });
    if (response.success && response.data) {
      isAuthenticated.value = true;
      sync();
    } else if (!response.success) {
      error.value = response.error;
    }
  } catch {
    // Popup may close during auth — expected
  }
  signingIn.value = false;
}

async function onSignOut() {
  await sendMessage({ type: 'SIGN_OUT' });
  isAuthenticated.value = false;
  clearApplications();
}

async function openSpreadsheet() {
  openingSheet.value = true;
  error.value = '';
  const response = await sendMessage({ type: 'OPEN_SPREADSHEET' });
  if (response.success && typeof response.data === 'string') {
    await chrome.tabs.create({ url: response.data });
  } else if (!response.success) {
    error.value = response.error;
  }
  openingSheet.value = false;
}

function onStatusChange(payload: { rowIndex: number; status: ResultStatus }) {
  // Skip optimistic temp rows (negative rowIndex) — not yet synced
  if (payload.rowIndex < 0) return;
  updateStatus(payload.rowIndex, payload.status);
}

function onAdd(payload: ApplicationData) {
  addApplication(payload);
}

function onRefresh() {
  sync();
}
</script>

<template>
  <div class="popup" :class="`theme-${theme}`">
    <div class="popup__inner">
      <!-- Auth screen -->
      <div v-if="authChecked && !isAuthenticated" class="auth-screen">
        <LogoIcon />
        <div class="brand__name">
          <div class="brand__title">My Next Role</div>
          <div class="brand__sub">{{ t.tag }}</div>
        </div>
        <p class="auth-screen__text">{{ t.signIn }}</p>
        <button class="btn-primary" :disabled="signingIn" @click="onSignIn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
          </svg>
          {{ signingIn ? t.signingIn : t.signIn }}
        </button>
      </div>

      <!-- Initial loader: only shown when authenticated but storage is empty -->
      <div v-else-if="showInitialLoader" class="loading">
        <div class="loading__spinner" />
      </div>

      <!-- Main content — shows instantly with local data -->
      <template v-else-if="isAuthenticated">
        <!-- Header -->
        <div class="hdr">
          <div class="brand">
            <LogoIcon />
            <div class="brand__name">
              <div class="brand__title">My Next Role</div>
              <div class="brand__sub">{{ t.tag }}</div>
            </div>
          </div>
          <div class="hdr__actions">
            <button class="btn-primary btn-add" :title="t.addNew" @click="showAddModal = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {{ t.addNew }}
            </button>
            <button class="icon-btn" :title="t.refresh" :disabled="syncing" @click="onRefresh">
              <svg :class="{ 'spin': syncing }" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" />
              </svg>
            </button>
            <button
              class="icon-btn"
              :title="t.openSheet"
              :disabled="openingSheet"
              @click="openSpreadsheet"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <path d="M14 3v6h6" />
                <path d="M9 13h6M9 17h4M9 9h2" />
              </svg>
            </button>
            <button class="icon-btn" @click="toggleTheme">
              <svg v-if="theme === 'light'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
              </svg>
            </button>
            <button class="lang-toggle" @click="toggleLang">
              {{ lang === 'ua' ? 'EN' : 'UA' }}
            </button>
            <button class="btn-ghost" @click="onSignOut">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {{ t.exit }}
            </button>
          </div>
        </div>

        <!-- Error bar -->
        <div v-if="error" class="error-bar">
          {{ error }}
        </div>

        <!-- Stats -->
        <StatsRow :stats="stats" :t="t" />

        <!-- Toolbar -->
        <div class="toolbar">
          <SearchBar v-model="searchQuery" :placeholder="t.search" />
          <FilterBar
            :t="t"
            :sites="uniqueSites"
            :site-filter="siteFilter"
            :status-filter="statusFilter"
            @update:site-filter="siteFilter = $event"
            @update:status-filter="statusFilter = $event"
          />
        </div>

        <!-- Table or Empty -->
        <EmptyState v-if="applications.length === 0" :t="t" />
        <template v-else>
          <ApplicationsTable
            :applications="paginated"
            :t="t"
            @status-change="onStatusChange"
          />
          <Pagination
            v-if="totalPages > 1"
            :current-page="currentPage"
            :total-pages="totalPages"
            :t="t"
            @go-to="goTo"
            @next="next"
            @prev="prev"
          />
        </template>

        <!-- Spacer fills remaining vertical space so footer stays at bottom -->
        <div class="popup__spacer" />

        <!-- Footer -->
        <FooterBar
          :t="t"
          :shown="paginated.length"
          :total="applications.length"
          :syncing="syncing"
        />

        <!-- Add modal -->
        <AddApplicationModal
          :open="showAddModal"
          :t="t"
          @close="showAddModal = false"
          @add="onAdd"
        />
      </template>
    </div>
  </div>
</template>
