# Toggl to Delorean

A small browser-based utility that loads time entries from [Toggl](https://toggl.com) (or a CSV export), groups and filters them for review, and formats clean timecard reports ready for entry into DeLorean.

The app follows a simple three-step workflow: **Import → Filter → View/Export**. Pull a date range straight from the Toggl API or drop in a CSV, narrow the data down by client, billable status, and project code, then read it back as a daily timecard, a set of charts, or a full-month Markdown report.

## Features

- **Two data sources** — fetch directly from the Toggl API v9 (via a lightweight cloud proxy) or upload a CSV export parsed with PapaParse.
- **Flexible grouping** — view entries by day, week, month, or all at once, with next/prev navigation.
- **Filtering** — filter by client, billable status, and project codes (DLG, TLP, PRJ, QAN, XDS).
- **Timecard reports** — formatted output sized for re-entry into DeLorean, with optional per-entry descriptions.
- **Charts** — visual summaries of where time was spent.
- **Monthly Markdown export** — generate a complete one-section-per-day Markdown report for an entire month.
- **Keyboard shortcuts** — `T` toggle scale, `O`/`W`/`M`/`A` set scale, `N`/`P` navigate, `D` toggle descriptions.

## Getting Started

```shell
git clone https://github.com/frozenfrank/toggl-to-delorean.git
cd toggl-to-delorean
npm install
npm start
```

`npm start` builds the app and serves it locally with `http-server`. Open the printed URL in your browser.

> **Note:** This project depends on [Web Awesome Pro](https://webawesome.com), referenced as a local file path in `devDependencies`. You'll need a local copy to install and build.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` / `npm run serve` | Build and serve the app locally |
| `npm run build` | Bundle to `dist/` with esbuild |
| `npm run distribute` | Build and publish to npm |

## Project Structure

The frontend is vanilla TypeScript (no framework), bundled with esbuild and dependent on Web Awesome (Lit) components.

- `src/index.ts` — bundle entry point
- `src/script.ts` — main app logic: data import, grouping by time scale, and report rendering
- `src/time-entry/` — the unified `TimeEntry` model that normalizes CSV and API formats, plus grouping/processing helpers
- `src/toggl/` — Toggl API v9 client (Basic Auth via cloud proxy)
- `src/report.ts` / `src/markdown-report.ts` — timecard and monthly Markdown report builders
- `src/charts.ts` — chart rendering
- `scripts/` — build and serve helpers

Toggl API tokens are stored in `localStorage` for convenience.
