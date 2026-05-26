### DeLorean Frontend (`src/`)

Three-step workflow: **Import → Filter → View/Export**

- **Data sources**: CSV upload (parsed with PapaParse) or Toggl API v9 (via cloud proxy)
- **`time-entry.ts`** — Unified `TimeEntry<T>` interface normalizing CSV and API formats. Computed fields: `durationSeconds`, `_computedDates` (day/week/month groupings)
- **`script.js`** — Main app logic: `processTimeEntryData()` groups entries by time scale, `renderTimecardReport()` formats output. Keyboard shortcuts: T (toggle scale), O/W/M/A (set scale), N/P (navigate), D (toggle descriptions)
- **`toggl/access.js`** — Toggl API client with Basic Auth. Key functions: `getProfile()`, `getTimeEntries()`
- Project codes extracted via regex patterns: DLG, TLP, PRJ, QAN, XDS

Code Conventions:
- Frontend is vanilla ES2017+ JavaScript with no bundler; dependencies loaded from CDN (WebAwesome, PapaParse)
- Week boundaries run Sunday → Saturday
- Toggl API tokens are stored in localStorage for convenience

## Web Awesome (Lit) Components

Web Awesome components are Lit elements. Lit **batches** reactive property updates: setting `.value`, `.checked`, `.disabled`, `.loading`, `.config`, etc. doesn't immediately reflect in the DOM or in getters that filter through children. The update applies on the next microtask.

Some getters depend on this update having run. The most dangerous example is `wa-select.value` — its getter filters the internal `_value` through a cached options list, and that cache is only invalidated on a deferred `processSlotChange()` microtask after slot mutations. Setting `daySelect.value = "<new-timestamp>"` immediately after replacing the wa-select's `<wa-option>` children, then reading it back synchronously, returns `null` — because the cached options still hold only the old (disabled) placeholder. This silently bypassed the date filter on initial data load until we awaited `updateComplete`.

### Convention in this codebase

Any function that programmatically mutates a Lit-reactive property on a wa-element (or mutates a wa-select's slotted options) must:
1. Be `async` and return `Promise<void>`.
2. `await element.updateComplete` after the writes, before the function resolves.
3. Batch related awaits with `Promise.all([a.updateComplete, b.updateComplete, ...])` to avoid serializing independent updates.

Callers compose with `await` when they need the settled state, or prefix with `void` to make a deliberate fire-and-forget explicit (e.g. event handlers that just trigger work).

### Quick reference

```typescript
// Single write
sw.checked = true;
await sw.updateComplete;

// Batched writes (across one or many elements)
nextButton.disabled = true;
prevButton.disabled = true;
await Promise.all([nextButton.updateComplete, prevButton.updateComplete]);

// Slot mutation on wa-select (replacing <wa-option> children)
select.innerHTML = '';
items.forEach(it => select.appendChild(createOptionElement(it.value, it.label)));
await select.updateComplete;   // cache won't be valid until this resolves

// Composing several mutating functions
await Promise.all([
  populateDateSelector(...),
  populateClientSelector(...),
  requireBillableSwitch.updateComplete,
]);

// Caller that doesn't need the settled state
void renderTimecardReport();
```

This applies to any reactive property, not just `.value`. When in doubt, await.

## Git

After the implementation of every plan, and at each batch/checkpoint/phase of longer plans, commit your code changes with `git`.

Always end your commit titles with "with Claude" so that I can easily distinguish the commits you make from mine. When authoring long commit messages, do not use command substitution. Instead, just write the message on multiple lines. The string doesn't close until the final close quote anyways.
