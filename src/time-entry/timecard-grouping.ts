import type { EntryGrouping, TimeEntry } from './time-entry';
import { extractDLGNumber, extractPRJNumber, extractQANNumber, extractTLPCode, extractXDSNumber } from './time-entry-processing';

/**
 * Filter a flat list of time entries by date range, billable flag, and client name.
 * Returns a new array; never mutates the input.
 */
export function filterTimeEntriesByDateRange(
  timeData: TimeEntry[],
  minDateIncl: Date | null,
  maxDateExcl: Date | null,
  requireBillable = false,
  clientName: string | null = null,
): TimeEntry[] {
  if (!timeData?.length) return [];

  return timeData.filter(entry => {
    if (requireBillable && !entry.billable) return false;
    if (clientName && (entry.clientName !== clientName)) return false;

    const entryDate = entry.start;
    return (!minDateIncl || entryDate >= minDateIncl) &&
           (!maxDateExcl || entryDate < maxDateExcl);
  });
}

/**
 * Group time entries by project code combinations (TLP/DLG/QAN/PRJ, optionally XDS),
 * summing durations and collecting source entries per group. Returns a stable-sorted array.
 */
export function prepareTimecardEntries<T>(timeData: TimeEntry<T>[], groupByXds = false, groupByTlp = true): EntryGrouping<T>[] {
  if (!timeData?.length) {
    return [];
  }

  const groupedEntries: Record<string, EntryGrouping<T>> = {};
  timeData.forEach(entry => {
    const tlpCode = extractTLPCode(entry) || "";
    const prjNumber = extractPRJNumber(entry) || "";
    const dlgNumber = extractDLGNumber(entry) || "";
    const qanNumber = extractQANNumber(entry) || "";
    const xdsNumber = extractXDSNumber(entry) || "";

    const groupingTlp = (!groupByTlp && tlpCode) ? "00000" : tlpCode; // Treat all entries *with a TLP* as equivalent
    let groupKey = `${groupingTlp}|${prjNumber}|${dlgNumber}|${qanNumber}`;
    if (groupByXds) groupKey += `|${xdsNumber}`;
    if (!groupedEntries[groupKey]) {
      groupedEntries[groupKey] = {
        tlpCode,
        prjNumber,
        dlgNumber,
        qanNumber,
        xdsNumber,
        totalSeconds: 0,
        entries: [],
      };
    }

    groupedEntries[groupKey].totalSeconds += entry.durationSeconds || 0;
    groupedEntries[groupKey].entries.push(entry);
  });

  // Return a sorted array of grouped entries
  return Object.values(groupedEntries).sort((a,b) =>
    a.prjNumber.localeCompare(b.prjNumber) ||
    (groupByTlp && a.tlpCode.localeCompare(b.tlpCode)) ||
    a.dlgNumber.localeCompare(b.dlgNumber) ||
    a.qanNumber.localeCompare(b.qanNumber) ||
    (groupByXds && a.xdsNumber.localeCompare(b.xdsNumber)) ||
    b.totalSeconds - a.totalSeconds
  );
}
