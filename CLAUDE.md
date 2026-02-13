# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

byte-bin is a personal utility repository containing:
- **Shell scripts** (`shell/`) — Bash aliases, project scaffolders, and CLI utilities
- **Toggl-to-DeLorean app** (`docs/delorean/`) — A web frontend (vanilla JS + WebAwesome UI) that imports Toggl time entries (via CSV or API) and produces timecard reports
- **Firebase Cloud Functions** (`cloud-functions/`) — A CORS proxy and test endpoint used by the DeLorean frontend to access the Toggl API

## Build & Development Commands

All cloud function commands run from `cloud-functions/functions/`:

```bash
npm run build          # Compile TypeScript → lib/
npm run build:watch    # Watch mode
npm run lint           # ESLint (Google style + TypeScript)
npm run serve          # Build + start Firebase emulators
npm run deploy         # Deploy to Firebase
```

The frontend (`docs/delorean/`) is static HTML/JS served via GitHub Pages — no build step required. TypeScript in `time-entry.ts` is compiled manually; the `.js` and `.d.ts` outputs are checked in.

## Architecture

### Cloud Functions (`cloud-functions/functions/src/index.ts`)

Two HTTP functions deployed to Firebase:
- **`helloWorld`** — Test endpoint
- **`proxy`** — Forwards requests to arbitrary URLs (used to bypass CORS for Toggl API calls). Accepts `?url=<target>`, forwards safe headers, supports GET/POST/DELETE/OPTIONS.

### DeLorean Frontend (`docs/delorean/`)

Three-step workflow: **Import → Filter → View/Export**

- **Data sources**: CSV upload (parsed with PapaParse) or Toggl API v9 (via cloud proxy)
- **`time-entry.ts`** — Unified `TimeEntry<T>` interface normalizing CSV and API formats. Computed fields: `durationSeconds`, `_computedDates` (day/week/month groupings)
- **`script.js`** — Main app logic: `processTimeEntryData()` groups entries by time scale, `renderTimecardReport()` formats output. Keyboard shortcuts: T (toggle scale), O/W/M/A (set scale), N/P (navigate), D (toggle descriptions)
- **`toggl/access.js`** — Toggl API client with Basic Auth. Key functions: `getProfile()`, `getTimeEntries()`, `makeTogglRequest()`
- Project codes extracted via regex patterns: DLG, TLP, PRJ, QAN

### Shell Scripts (`shell/`)

- **`.bash_aliases`** — Extensive git aliases and utility functions
- **`create-ts-project.sh`** — TypeScript project scaffolder
- **`sizeof-node-modules.sh`** — Finds and sorts node_modules by disk usage

## Code Conventions

- Cloud functions use strict TypeScript (ES2017 target, NodeNext modules), ESLint with Google style, double quotes
- Frontend is vanilla ES2017+ JavaScript with no bundler; dependencies loaded from CDN (WebAwesome, PapaParse)
- Week boundaries run Sunday → Saturday
- Toggl API tokens are stored in localStorage for convenience
