import type { EntryGrouping, TimeEntry } from './time-entry/time-entry';
import { filterTimeEntriesByDateRange, prepareTimecardEntries } from './time-entry/timecard-grouping';

export interface MonthlyExportOptions {
  timeData: TimeEntry[];
  /** Any Date within the target month. Internally normalized to the first of the month. */
  monthDate: Date;
  requireBillable: boolean;
  clientName: string | null;
  showAllDescriptions: boolean;
  groupByTlp: boolean;
  groupByXds: boolean;
}

/**
 * Build a Markdown report for an entire month, one section per day with entries.
 * Days without entries (after filters) are omitted. Empty months produce a
 * report with just the header.
 */
export function buildMonthlyMarkdownReport(opts: MonthlyExportOptions): string {
  const { timeData, requireBillable, clientName, showAllDescriptions, groupByTlp, groupByXds } = opts;

  const monthStart = new Date(opts.monthDate.getFullYear(), opts.monthDate.getMonth(), 1);
  const monthEnd = new Date(opts.monthDate.getFullYear(), opts.monthDate.getMonth() + 1, 1);
  const monthLabel = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' });

  let out = `# DeLorean Transfer Timecard Report — ${monthLabel}\n\n`;
  out += `Generated on: ${new Date().toLocaleString()}\n\n`;

  // One pass to filter, then in-memory bucket by day. Avoids re-filtering 30+ times.
  const monthFiltered = filterTimeEntriesByDateRange(timeData, monthStart, monthEnd, requireBillable, clientName);
  const dayBuckets = new Map<number, TimeEntry[]>();
  for (const entry of monthFiltered) {
    const dayValue = +entry._computedDates!.day;
    let bucket = dayBuckets.get(dayValue);
    if (!bucket) {
      bucket = [];
      dayBuckets.set(dayValue, bucket);
    }
    bucket.push(entry);
  }

  const sortedDayValues = Array.from(dayBuckets.keys()).sort((a, b) => a - b);
  for (const dayValue of sortedDayValues) {
    const dayDate = new Date(dayValue);
    const dayEntries = dayBuckets.get(dayValue)!;
    const grouped = prepareTimecardEntries(dayEntries, groupByXds, groupByTlp);

    out += `## ${dayDate.toLocaleDateString('default', { dateStyle: 'full' })}\n\n`;
    out += '```\n';
    out += formatTimecardEntries(grouped, showAllDescriptions, groupByXds, groupByTlp);
    out += '```\n\n';
  }

  return out;
}

// Restored from commit a0be62d (the original single-period text formatter),
// with the introduction title, "Report date" line, and "Generated on" footer
// stripped. Callers add those once per report file instead of once per day.

/**
 * Format one period's grouped timecard entries as a monospaced text block.
 * Returns the table header, body rows, and per-period summary. The caller is
 * responsible for surrounding context (titles, dates, "Generated on", etc.).
 */
export function formatTimecardEntries(
  entries: EntryGrouping<unknown>[],
  displayAllDescriptions = false,
  groupByXds = false,
  groupByTlp = true,
): string {
  let message = '';

  const uniqueTLPs = new Set();
  const uniquePRJs = new Set();
  const uniqueDLGs = new Set();
  const uniqueQANs = new Set();
  const uniqueXDSs = new Set();
  const uniqueDescriptions = new Set();

  let totalHours = 0;
  let totalRoundedHours = 0;
  let timecardLines = 0;
  let representedEntries = 0;

  // Header line
  const minWidths = [
    ...(groupByTlp ? [5] : []),
    8, 8, 8,
    ...(groupByXds ? [8] : []),
    5, 40,
  ];
  const descHeader = `Descriptions ${displayAllDescriptions ? '(All Distinct)' : '(Sample)'}`;
  const headerLine = formatTimecardLine(minWidths, [
    ...(groupByTlp ? ['TLP'] : []),
    'Dev Log', 'QAN', 'PRJ',
    ...(groupByXds ? ['XDS'] : []),
    'Hours', descHeader,
  ], true);
  message += headerLine + '\n';
  message += '='.repeat(headerLine.length) + '\n';

  // Generate lines for each entry
  let tlpCode, hours, hoursRounded, lineEntriesSet, lineEntriesArr;
  for (const entry of entries) {

    // Perform basic validation
    tlpCode = +entry.tlpCode;
    if (!tlpCode) continue; // Skip entries without TLP code

    hours = entry.totalSeconds / 3600;
    hoursRounded = Math.round(hours * 4) / 4; // Round to nearest quarter hour

    totalHours += hours;
    totalRoundedHours += hoursRounded;
    if (hoursRounded <= 0) continue; // Hide zero-hour entries, while counting in totals

    // Collect unique identifiers
    if (tlpCode) uniqueTLPs.add(tlpCode);
    if (entry.prjNumber) uniquePRJs.add(entry.prjNumber);
    if (entry.dlgNumber) uniqueDLGs.add(entry.dlgNumber);
    if (entry.qanNumber) uniqueQANs.add(entry.qanNumber);
    if (entry.xdsNumber) uniqueXDSs.add(entry.xdsNumber);

    lineEntriesSet = new Set<string>();
    for (const e of entry.entries) {
      if (!e.description) continue;
      uniqueDescriptions.add(e.description);
      lineEntriesSet.add(e.description);
    }
    lineEntriesArr = Array.from(lineEntriesSet).sort();

    // Represent main line
    timecardLines++;
    message += formatTimecardLine(minWidths, [
      ...(groupByTlp ? [tlpCode] : []),
      entry.dlgNumber, entry.qanNumber, entry.prjNumber,
      ...(groupByXds ? [entry.xdsNumber] : []),
      hoursRounded, lineEntriesArr[0],
    ]) + '\n';

    // Represent each unique description on its own line
    representedEntries += entry.entries.length || 0;
    if (displayAllDescriptions) {
      for (let i = 1; i < lineEntriesArr.length; i++) {
        message += formatTimecardLine(minWidths, [
          ...(groupByTlp ? ['^'] : []),
          entry.dlgNumber ? '^' : '', entry.qanNumber ? '^' : '', entry.prjNumber ? '^' : '',
          ...(groupByXds ? [entry.xdsNumber ? '^' : ''] : []),
          '^', lineEntriesArr[i],
        ], false, true) + '\n';
      }
    }
  }

  if (timecardLines <= 0) {
    return 'No loggable time entries.\n';
  }

  // Summary lines
  message += '-'.repeat(headerLine.length) + '\n';
  message += formatTimecardLine(minWidths, [
    ...(groupByTlp ? [uniqueTLPs.size] : []),
    uniqueDLGs.size, uniqueQANs.size, uniquePRJs.size,
    ...(groupByXds ? [uniqueXDSs.size] : []),
    totalRoundedHours, uniqueDescriptions.size + '   (distinct entities)',
  ]) + '\n';

  // Report Detail
  message += '\n';
  message += `Total Rounded hours: ${totalRoundedHours.toFixed(2)} hrs\n`;
  message += `Total Actual hours: ${totalHours.toFixed(2)} hrs`;
  if (totalRoundedHours !== totalHours) {
    message += `  (Gap: ${((totalRoundedHours - totalHours) * 60).toFixed(1)} mins)`;
  }
  message += `\n\n`;

  message += `Total Timecard Lines: ${timecardLines}\n`;
  message += `Total Represented Entries: ${representedEntries}\n`;

  return message;
}

function formatTimecardLine(minWidths: number[], values: any[], isHeader = false, isSubsequent = false): string {
  const descriptionColIdx = minWidths.length - 1;
  return values.map((val, idx) => {
    const strVal = (val !== null && val !== undefined) ? String(val) : '';
    const alignLeft = (idx === descriptionColIdx) || isHeader;
    return alignLeft ? strVal.padEnd(minWidths[idx]) : strVal.padStart(minWidths[idx]);
  }).join(isSubsequent ? ' . ' : ' | ');
}
