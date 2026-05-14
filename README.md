<div align="center">

<img src="logo128x128.png" width="96" height="96" alt="My Next Role logo" />

# My Next Role

**Auto-track job applications across job boards into your own Google Sheet.**

</div>

---

## Overview

**My Next Role** is a Chrome extension that automatically detects when you submit a job application on supported sites, logs it to a Google Spreadsheet you own, and monitors your Gmail for response emails to keep statuses up to date. No backend, no analytics, no data sharing — everything lives in your own Google account.

> Built for job seekers who apply to dozens of roles a week and refuse to keep a manual tracker.

---

## ✨ Features

- 🎯 **Automatic detection** — applies on supported sites are logged the moment you click submit
- 📊 **Your own spreadsheet** — data lives in `MyNextRole` sheet in your Google Drive, fully under your control
- 📬 **Gmail response tracking** — keyword analysis detects interview invites, offers, rejections, and test tasks
- 🌗 **Light + dark themes** — warm coffee-toned dark mode
- 🌐 **Bilingual UI** — Ukrainian and English
- 🔍 **Search, filter, paginate** — find any application by company, role, site, or status
- ➕ **Manual entry** — add applications submitted on unsupported sites
- 📈 **Stats dashboard** — total applied, this week, response rate, conversion
- 💾 **Offline-resilient** — failed Sheet writes queue and retry automatically
- 🔐 **Privacy first** — no analytics, no telemetry, no third-party servers

---

## 📥 Install

### From the Chrome Web Store

> https://chromewebstore.google.com/detail/my-next-role/laflepbgfhenjkpjjmhodbeccklkhlaf 

### From source (development build)

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/my-next-role.git
cd my-next-role

# 2. Use Node 22.12+ (required for WXT)
nvm use 22

# 3. Install dependencies
pnpm install

# 4. Build
pnpm build

# 5. Load .output/chrome-mv3 as unpacked in chrome://extensions
```

---

## 🛠️ How it works

```
┌──────────────────────┐    APPLICATION_SUBMITTED    ┌─────────────────────┐
│  Content Scripts     │ ─────────────────────────▶  │   Background SW     │
│  (per job site)      │                             │                     │
│                      │                             │  • OAuth (Google)   │
│  Detect apply click  │ ◀────────────────────────── │  • Sheets writes    │
│  Extract company,    │                             │  • Gmail polling    │
│  role, cover letter  │                             │  • Offline queue    │
└──────────────────────┘                             │  • Badge / notify   │
                                                     │                     │
┌──────────────────────┐    FETCH_APPLICATIONS       │                     │
│  Popup (Vue 3)       │ ─────────────────────────▶  └─────────┬───────────┘
│                      │                                        │
│  Stats / Search /    │ ◀──────────────────────────            │ HTTPS
│  Filter / Table /    │       ApplicationRow[]                 ▼
│  Pagination          │                              ┌─────────────────────┐
└──────────────────────┘                              │ Google Sheets API   │
                                                      │ Google Drive API    │
                                                      │ Gmail API (read)    │
                                                      └─────────────────────┘
```

### Step by step

1. **Sign in** with Google. The extension creates (or locates by filename) your `MyNextRole` spreadsheet via Drive API.
2. **Apply on a supported job board.** A content script detects the submission, extracts visible company / role / URL / cover-letter data, and forwards it to the background service worker.
3. **Background writes the row** to your Google Sheet via the Sheets API.
4. **Every 5 minutes** the background polls Gmail for new messages. Subject lines and snippets are analyzed locally with keyword matching; the corresponding application status is updated automatically.
5. **Popup reads from local cache** (`chrome.storage.local`) so it opens instantly, and shows a sync indicator when the background is pulling fresh data.

---

## 🧱 Tech stack

- **[WXT 0.20](https://wxt.dev)** — Vite-based Chrome extension toolkit
- **Vue 3.5** + Composition API + `<script setup>`
- **TypeScript** (strict)
- **No CSS framework** — hand-rolled design system with CSS custom properties
- **pnpm** for package management

---

## 📂 Project structure

```
.
├── entrypoints/
│   ├── background.ts           # Service worker — message router, alarms
│   ├── popup/                  # Vue 3 popup UI
│   │   ├── App.vue
│   │   ├── components/         # StatsRow, FilterBar, ApplicationsTable, etc.
│   │   ├── composables/        # useTheme, useI18n, useStats, useFilters, etc.
│   │   └── style.css           # Hand-rolled design system
│   └── *.content.ts            # Per-site content scripts
├── lib/
│   ├── handlers/               # Site-specific application-detection logic
│   ├── messaging/              # Typed message bus (sendMessage / onMessage)
│   ├── services/               # auth, sheets, gmail, queue, storage
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # constants, email-analyzer
└── wxt.config.ts               # Manifest generation
```

---

## 🔧 Development

### Build commands

```bash
# Dev mode (auto-reload, with stable extension key)
pnpm dev

# Production build (with stable extension key — for local unpacked testing)
pnpm build

# Production build for Chrome Web Store (no `key` field in manifest)
CWS_BUILD=1 pnpm zip
```

### Adding a new site handler

1. Create `lib/handlers/<site>-handler.ts` extending `BaseHandler`.
2. Create `entrypoints/<site>.content.ts` and instantiate the handler.
3. WXT auto-registers the content script on next build.

### Adding an i18n string

1. Add the key to both `T.ua` and `T.en` in `entrypoints/popup/composables/useI18n.ts`. TypeScript will fail if either branch is missing.
2. Reference via `t.newKey` in templates.

---

## 🔐 Privacy & data

- **No backend.** The extension communicates only with Google APIs under your own OAuth grant.
- **No analytics, telemetry, or crash reporting.**
- **No third-party data sharing.**
- **Your data lives in your own Google Sheet** — delete the sheet to delete the data.
- **Gmail access is read-only** and limited to message headers and snippets for keyword analysis. Email content never leaves your browser.
- **Limited Use compliance** — adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).

Full Privacy Policy: https://tartan-pineapple-d68.notion.site/Privacy-Policy-My-Next-Role-3607c69c6f5d80ceb407dfeeff357b98?pvs=74

---

## 🚧 Known limitations

- LinkedIn external "Apply on company site" is not tracked (external redirect by design).
- Cover letter capture works only when typed inside the job site's own form.
- Email status detection uses keyword heuristics — false positives/negatives are possible. Manual override available via the status dropdown.
- Filters do not yet persist across popup reopens.

---

<div align="center">

Made with ☕ for job seekers who refuse to track applications in their head or manually in Google Sheets.

</div>
