
## Project Overview

byte-bin is a personal utility repository containing:
- **Toggl-to-DeLorean app** (`docs/delorean/`) — A web frontend (vanilla JS + WebAwesome UI) that imports Toggl time entries (via CSV or API) and produces timecard reports

This worktree has a sparse checkout that only includes the toggl-to-delorean files, and very few others. You should be clear to explore the available files and find what you need.


### DeLorean Frontend (`docs/delorean/`)

Three-step workflow: **Import → Filter → View/Export**

- **Data sources**: CSV upload (parsed with PapaParse) or Toggl API v9 (via cloud proxy)
- **`time-entry.ts`** — Unified `TimeEntry<T>` interface normalizing CSV and API formats. Computed fields: `durationSeconds`, `_computedDates` (day/week/month groupings)
- **`script.js`** — Main app logic: `processTimeEntryData()` groups entries by time scale, `renderTimecardReport()` formats output. Keyboard shortcuts: T (toggle scale), O/W/M/A (set scale), N/P (navigate), D (toggle descriptions)
- **`toggl/access.js`** — Toggl API client with Basic Auth. Key functions: `getProfile()`, `getTimeEntries()`, `makeTogglRequest()`
- Project codes extracted via regex patterns: DLG, TLP, PRJ, QAN

Code Conventions:
- Frontend is vanilla ES2017+ JavaScript with no bundler; dependencies loaded from CDN (WebAwesome, PapaParse)
- Week boundaries run Sunday → Saturday
- Toggl API tokens are stored in localStorage for convenience

## Git

After the implementation of every plan, and at each batch/checkpoint/phase of longer plans, commit your code changes with `git`.

Always end your commit titles with "with Claude" so that I can easily distinguish the commits you make from mine. When authoring long commit messages, do not use command substitution. Instead, just write the message on multiple lines. The string doesn't close until the final close quote anyways.
