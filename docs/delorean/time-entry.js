/**
 * Build this file with:
 * $ tsc -t esnext time-entry.ts && sed -i '' -E 's/^export[[:space:]]+//' time-entry.js
 */
/** Converts a string duration into the number of elapsed seconds. e.g., "01:30:00" */
function parseDurationString(duration) {
    const [h, m, s] = duration.split(':').map(Number);
    return (h * 60 * 60) + (m * 60) + s;
}
/** Safely build a Date from separate date and time fields (CSV export format). */
function buildDateFromParts(datePart, timePart) {
    if (!datePart && !timePart)
        return null;
    try {
        // If time missing, default to 00:00:00
        const time = timePart && timePart.trim() ? timePart.trim() : "00:00:00";
        // Use ISO-like string without timezone so it parses as local time.
        const isoLike = `${datePart}T${time}`;
        const d = new Date(isoLike);
        if (Number.isNaN(d.getTime()))
            return null;
        return d;
    }
    catch (e) {
        return null;
    }
}
/** @public Convert Toggl API data into our standard format */
function convertApiDataToTimeEntryData(apiEntries) {
    const entries = apiEntries.map((e) => {
        const start = new Date(e.start);
        const stop = e.stop ? new Date(e.stop) : null;
        return {
            description: e.description || "",
            start,
            stop,
            durationSeconds: e.duration > 0 ? e.duration : null,
            projectName: e.project_name || "",
            clientName: e.client_name || undefined,
            tagNames: e.tags || [],
            billable: typeof e.billable === 'boolean' ? e.billable : undefined,
            userName: e.user_name || "",
            original: e,
        };
    });
    return {
        hasClientData: true,
        hasBillableData: true,
        entries,
    };
}
/** @public Convert Toggl CSV data into our standard format */
function convertParsedCsvToTimeEntryData(parsed) {
    const csvEntries = parsed.data || [];
    const entries = csvEntries.map((r) => {
        const start = buildDateFromParts(r['Start date'], r['Start time']);
        const stop = buildDateFromParts(r['Stop date'], r['Stop time']);
        let durationSeconds = null;
        if (r['Duration']) {
            durationSeconds = parseDurationString(r['Duration']);
        }
        // If duration is zero but start/stop exist, compute from them
        if ((!durationSeconds || durationSeconds === 0) && start && stop) {
            durationSeconds = Math.round((stop.getTime() - start.getTime()) / 1000);
        }
        const tagNames = r['Tags']
            ? r['Tags'].split(',').map((t) => t.trim()).filter(Boolean)
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
    const hasClientData = parsed.meta.fields.includes('Client');
    const hasBillableData = parsed.meta.fields.includes('Billable');
    return {
        hasClientData,
        hasBillableData,
        entries,
    };
}
