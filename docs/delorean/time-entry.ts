
// Implementation helpers to convert raw Toggl API and Toggl CSV-parsed data
// into the unified TimeEntryData<T> structures declared in `time-entry.d.ts`.

// NOTE: The types used here (TimeEntryData, TimeEntry,
// TogglAPITimeEntryWithMetadata, TogglExportTimeEntry) are declared in
// `time-entry.d.ts` which sits alongside this file.

// Parse a duration string in H:mm:ss or mm:ss or H:mm format into seconds.
function parseDurationString(duration: string): number {
  if (!duration) return 0;
  // Normalize (remove whitespace)
  const parts = duration.trim().split(":").map(p => p.trim());
  // Supported: H:mm:ss or mm:ss or H:mm
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return Math.round((h || 0) * 3600 + (m || 0) * 60 + (s || 0));
  }
  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return Math.round((m || 0) * 60 + (s || 0));
  }
  // Fallback: single number interpreted as seconds
  const asNum = Number(duration);
  return Number.isFinite(asNum) ? Math.round(asNum) : 0;
}

// Safely build a Date from separate date and time fields (CSV export format).
function buildDateFromParts(datePart?: string, timePart?: string): Date | null {
  if (!datePart && !timePart) return null;
  try {
    // If time missing, default to 00:00:00
    const time = timePart && timePart.trim() ? timePart.trim() : "00:00:00";
    // Use ISO-like string without timezone so it parses as local time.
    const isoLike = `${datePart}T${time}`;
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    return null;
  }
}

// Convert an array of Toggl API entries into TimeEntryData<TogglAPITimeEntryWithMetadata>
export function convertApiDataToTimeEntryData(
  apiEntries: TogglAPITimeEntryWithMetadata[]
): TimeEntryData<TogglAPITimeEntryWithMetadata> {
  const entries = apiEntries.map((e): TimeEntry<TogglAPITimeEntryWithMetadata> => {
    const start = new Date(e.start);
    const stop = e.stop ? new Date(e.stop) : null;

    let durationSeconds: number;
    if (stop && !Number.isNaN(start.getTime()) && !Number.isNaN(stop.getTime())) {
      durationSeconds = Math.round((stop.getTime() - start.getTime()) / 1000);
    } else if (typeof e.duration === 'number' && e.duration >= 0) {
      durationSeconds = e.duration;
    } else if (typeof e.duration === 'number') {
      // Running/negative durations: use absolute value as fallback
      durationSeconds = Math.abs(e.duration);
    } else {
      durationSeconds = 0;
    }

    return {
      description: e.description || "",
      start,
      stop,
      durationSeconds,
      projectName: e.project_name || "",
      clientName: e.client_name || undefined,
      tagNames: Array.isArray(e.tags) ? e.tags.slice() : [],
      billable: typeof e.billable === 'boolean' ? e.billable : undefined,
      userName: e.user_name || "",
      original: e,
    };
  });

  const hasClientData = entries.some(en => typeof en.clientName === 'string' && en.clientName !== '');
  const hasBillableData = entries.some(en => typeof en.billable === 'boolean');

  return {
    hasClientData,
    hasBillableData,
    entries,
  };
}

// Convert the parsed CSV JSON (from `sample-parsed-data.json`) into
// TimeEntryData<TogglExportTimeEntry>. The parsed structure is expected to be:
// { data: TogglExportTimeEntry[], errors: any[], meta: any }
export function convertParsedCsvToTimeEntryData(
  parsed: {
    data: TogglExportTimeEntry[];
    errors?: any[];
    meta?: any;
  }
): TimeEntryData<TogglExportTimeEntry> {
  const csvEntries = parsed.data || [];

  const entries = csvEntries.map((r): TimeEntry<TogglExportTimeEntry> => {
    const start = buildDateFromParts(r['Start date'], r['Start time']);
    const stop = buildDateFromParts(r['Stop date'], r['Stop time']);

    let durationSeconds = 0;
    if (r['Duration']) {
      durationSeconds = parseDurationString(r['Duration']);
    }
    // If duration is zero but start/stop exist, compute from them
    if ((!durationSeconds || durationSeconds === 0) && start && stop) {
      durationSeconds = Math.round((stop.getTime() - start.getTime()) / 1000);
    }

    const tagNames = typeof r['Tags'] === 'string' && r['Tags'].trim()
      ? r['Tags'].split(',').map(t => t.trim()).filter(Boolean)
      : [];

    return {
      description: r['Description'] || "",
      start: start || new Date(NaN),
      stop: stop,
      durationSeconds,
      projectName: r['Project'] || "",
      clientName: r['Client'] || undefined,
      tagNames,
      billable: r['Billable'] === 'Yes' ? true : r['Billable'] === 'No' ? false : undefined,
      userName: r['Member'] || "",
      original: r,
    };
  });

  const hasClientData = entries.some(en => typeof en.clientName === 'string' && en.clientName !== undefined);
  const hasBillableData = entries.some(en => typeof en.billable === 'boolean');

  return {
    hasClientData,
    hasBillableData,
    entries,
  };
}

// Export helpers for tests or further usage
export const _helpers = {
  parseDurationString,
  buildDateFromParts,
};
