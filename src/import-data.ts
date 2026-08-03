import { formatDuration, getElementById } from './helper';
import { WaCallout, WaIcon } from './model/web-awesome';
import { setStepsAvailable } from './script';
import { TimeEntry } from './time-entry/time-entry';

// Status indicator on the "Import Data" tab. Signals whether a CSV/API import
// produced usable time entries, since the downstream filter/view controls (the
// old implicit success signal) now live on separate, hidden tabs.

const DATA_STATUS_CALLOUT_ID = 'dataStatusCallout';
const DATA_STATUS_ICON_ID = 'dataStatusIcon';
const DATA_STATUS_CONTENT_ID = 'dataStatusContent';

const formatDate = (d: Date) =>
  d.toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * Reflects the current data-availability state in the Import Data status callout.
 * - `allData === null`: no data imported yet (neutral / waiting).
 * - `allData.length === 0`: data imported but no usable entries (danger / error).
 * - otherwise: success, summarizing count, total duration, and date range.
 */
export async function updateDataStatus(allData: [] | null): Promise<void>
export async function updateDataStatus(allData: TimeEntry[] | null, uniqueDays: Date[]): Promise<void>
export async function updateDataStatus(allData: TimeEntry[] | null, uniqueDays?: Date[]): Promise<void> {
  const callout = getElementById<WaCallout>(DATA_STATUS_CALLOUT_ID);
  const icon = getElementById<WaIcon>(DATA_STATUS_ICON_ID);
  const content = getElementById(DATA_STATUS_CONTENT_ID);

  let hasData = false;

  if (allData === null) {
    callout.variant = 'neutral';
    icon.name = 'hourglass-half';
    content.innerHTML =
      '<strong>Waiting for data…</strong><br />'
      + 'Import a Toggl CSV file or download from the API to get started.';
  } else if (allData.length === 0) {
    callout.variant = 'danger';
    icon.name = 'circle-exclamation';
    content.innerHTML =
      '<strong>No time entries found</strong><br />'
      + 'The imported data did not contain any usable time entries. '
      + 'Check your file or download and try again.';
  } else {
    if (uniqueDays === undefined) {
      throw new Error("Expected uniqueDays to not be undefined when all data is provided")
    }

    hasData = true;

    const totalSeconds = allData.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
    const minDate = uniqueDays[0];
    const maxDate = uniqueDays[uniqueDays.length - 1];

    callout.variant = 'success';
    icon.name = 'circle-check';
    content.innerHTML =
      `<strong>${allData.length} time ${allData.length === 1 ? 'entry' : 'entries'} loaded</strong><br />`
      + `Total tracked: ${formatDuration(totalSeconds)}<br />`
      + `Date range: ${formatDate(minDate)} – ${formatDate(maxDate)}`;
  }

  await Promise.all([
    setStepsAvailable(hasData),
    callout.updateComplete,
    icon.updateComplete,
  ]);
}

/** Danger callout naming the required CSV columns that were missing. */
export async function updateDataStatusMissingColumns(missing: string[]): Promise<void> {
  const callout = getElementById<WaCallout>(DATA_STATUS_CALLOUT_ID);
  const icon = getElementById<WaIcon>(DATA_STATUS_ICON_ID);
  const content = getElementById(DATA_STATUS_CONTENT_ID);

  callout.variant = 'danger';
  icon.name = 'circle-exclamation';
  content.innerHTML =
    '<strong>Missing required columns</strong><br />'
    + 'The imported file is missing these required column(s): '
    + `<b>${missing.join(', ')}</b>.<br />`
    + 'Enable them in Toggl before exporting and try again.';

  await Promise.all([
    setStepsAvailable(false),
    callout.updateComplete,
    icon.updateComplete,
  ]);
}
