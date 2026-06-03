# Toggl to Delorean has moved 🚚

This project no longer lives here. As of **June 2026**, it has its own dedicated home:

### 👉 https://github.com/frozenfrank/toggl-to-delorean

It previously lived as the `delorean-main` branch of the `byte-bin` polyrepo. Splitting it out into its own repository gives it:

- **Dedicated issues and pull requests** — no more sharing a tracker with unrelated branches.
- **A dedicated tag/release space** — versions and releases belong to this project alone.
- **A proper `main` branch** — `main` is the project, instead of one branch among many.
- **A more conventional layout** in general, so it behaves the way people expect a repo to.

Please head to the new repo for the latest code, history, and releases.

---

## About the project

A small browser-based utility that loads time entries from [Toggl](https://toggl.com) (or a CSV export), groups and filters them for review, and formats clean timecard reports ready for entry into DeLorean.

The app follows a simple three-step workflow: **Import → Filter → View/Export**. Pull a date range straight from the Toggl API or drop in a CSV, narrow the data down by client, billable status, and project code, then read it back as a daily timecard, a set of charts, or a full-month Markdown report.
