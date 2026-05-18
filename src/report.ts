import { WaCopyButton, WaIcon } from "./model/web-awesome";
import { EntryGrouping } from "./time-entry/time-entry";

// ### HTML Report Rendering ###
// Builds interactive HTML timecard report DOM elements.
// Called from renderTimecardReport() in script.js.

type Entry = EntryGrouping<unknown>;

/**
 * Builds the full timecard report as a DOM element.
 *
 * @param {Array} entries - Grouped timecard entries from prepareTimecardEntries()
 * @param {boolean} showAllDescriptions - Whether to show all distinct descriptions per row
 * @param {boolean} groupByXds - Whether XDS column is shown
 * @param {boolean} groupByTlp - Whether TLP column is shown
 * @returns {HTMLElement}
 */
export function buildTimecardReportElement(entries: Entry[], showAllDescriptions: boolean, groupByXds: boolean, groupByTlp: boolean): HTMLElement {
  const container = document.createElement('div');

  // Collect stats while building the table body, so we can build the header/footer around them
  const stats = collectTimecardStats(entries, groupByTlp);

  if (stats.timecardLines === 0) {
    container.appendChild(buildNoEntriesMessage());
    return container;
  }

  container.appendChild(buildReportHeader(stats.minDate, stats.maxDate));
  container.appendChild(buildTimecardTable(entries, stats, showAllDescriptions, groupByXds, groupByTlp));
  container.appendChild(buildReportSummary(stats));

  const footer = document.createElement('p');
  footer.className = 'timecard-footer wa-body-m';
  footer.textContent = `Generated on: ${new Date().toLocaleString()}`;
  container.appendChild(footer);

  return container;
}

// ### Stats Collection ###

interface TimecardStats {
    uniqueTLPs: Set<number>;
    uniquePRJs: Set<string>;
    uniqueDLGs: Set<string>;
    uniqueQANs: Set<string>;
    uniqueXDSs: Set<string>;
    uniqueDescriptions: Set<string>;

    totalHours: number;
    totalRoundedHours: number;
    timecardLines: number;
    representedEntries: number;

    minDate: Date | null;
    maxDate: Date | null;
  }

/**
 * Makes a single pass through entries to collect all stats needed for header, footer, and summary.
 * Only counts entries that have a TLP code and non-zero rounded hours (same rules as rendering).
 */
function collectTimecardStats(entries: Entry[], groupByTlp: boolean): TimecardStats {
  const uniqueTLPs = new Set<number>();
  const uniquePRJs = new Set<string>();
  const uniqueDLGs = new Set<string>();
  const uniqueQANs = new Set<string>();
  const uniqueXDSs = new Set<string>();
  const uniqueDescriptions = new Set<string>();

  let totalHours = 0;
  let totalRoundedHours = 0;
  let timecardLines = 0;
  let representedEntries = 0;
  let minDate: Date | number = Infinity;
  let maxDate: Date | number = -Infinity;

  for (const entry of entries) {
    const tlpCode = +entry.tlpCode;
    if (!tlpCode) continue;

    const hours = entry.totalSeconds / 3600;
    const hoursRounded = Math.round(hours * 4) / 4;

    totalHours += hours;
    totalRoundedHours += hoursRounded;
    if (hoursRounded <= 0) continue;

    if (tlpCode) uniqueTLPs.add(tlpCode);
    if (entry.prjNumber) uniquePRJs.add(entry.prjNumber);
    if (entry.dlgNumber) uniqueDLGs.add(entry.dlgNumber);
    if (entry.qanNumber) uniqueQANs.add(entry.qanNumber);
    if (entry.xdsNumber) uniqueXDSs.add(entry.xdsNumber);

    for (const e of entry.entries) {
      const dateVal = e._computedDates!.day;
      if (+dateVal < +minDate) minDate = dateVal;
      if (+dateVal > +maxDate) maxDate = dateVal;
      if (e.description) uniqueDescriptions.add(e.description);
    }

    timecardLines++;
    representedEntries += entry.entries.length || 0;
  }

  return {
    uniqueTLPs, uniquePRJs, uniqueDLGs, uniqueQANs, uniqueXDSs, uniqueDescriptions,
    totalHours, totalRoundedHours,
    timecardLines, representedEntries,
    minDate: minDate === Infinity ? null : minDate as Date,
    maxDate: maxDate === -Infinity ? null : maxDate as Date,
  };
}

// ### Section Builders ###

function buildReportHeader(minDate: Date | null, maxDate: Date | null) {
  const header = document.createElement('div');
  header.className = 'timecard-header';

  const title = document.createElement('h3');
  title.textContent = 'DeLorean Transfer Timecard Report';
  header.appendChild(title);

  if (minDate && maxDate) {
    const dateLine = document.createElement('p');
    dateLine.className = 'wa-body-m';
    if (+minDate === +maxDate) {
      dateLine.textContent = `Report date: ${minDate.toLocaleDateString('default', { dateStyle: 'full' })}`;
    } else {
      dateLine.textContent = `Report date: `
        + minDate.toLocaleDateString('default', { month: 'short', day: 'numeric', weekday: 'short' })
        + ' to '
        + maxDate.toLocaleDateString('default', { dateStyle: 'full' });
    }
    header.appendChild(dateLine);
  }

  return header;
}

function buildTimecardTable(entries: Entry[], stats: TimecardStats, showAllDescriptions: boolean, groupByXds: boolean, groupByTlp: boolean) {
  const table = document.createElement('table');
  table.className = 'timecard-table';

  table.appendChild(buildTableHead(groupByTlp, groupByXds, showAllDescriptions, stats));
  table.appendChild(buildTableBody(entries, showAllDescriptions, groupByXds, groupByTlp));
  table.appendChild(buildTableFoot(stats, groupByXds, groupByTlp));

  return table;
}

function buildReportSummary(stats: TimecardStats) {
  const div = document.createElement('div');
  div.className = 'timecard-summary wa-body-s';

  const gapMins = ((stats.totalRoundedHours - stats.totalHours) * 60).toFixed(1);
  const gapText = stats.totalRoundedHours !== stats.totalHours ? `  (Gap: ${gapMins} mins)` : '';

  const lines = [
    `Total Rounded hours: ${stats.totalRoundedHours.toFixed(2)} hrs`,
    `Total Actual hours: ${stats.totalHours.toFixed(2)} hrs${gapText}`,
    ``,
    `Total Timecard Lines: ${stats.timecardLines}`,
    `Total Represented Entries: ${stats.representedEntries}`,
  ];

  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line;
    div.appendChild(p);
  }

  return div;
}

function buildNoEntriesMessage() {
  const p = document.createElement('p');
  p.textContent = 'No loggable time entries.';
  return p;
}

// ### Table Section Builders ###

function buildTableHead(groupByTlp: boolean, groupByXds: boolean, showAllDescriptions: boolean, stats: TimecardStats) {
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');

  const descHeader = `Descriptions ${showAllDescriptions ? '(All Distinct)' : '(Sample)'}`;
  const headerSpecs = [
    ...(groupByTlp ? [{ text: 'TLP',     copySet: stats.uniqueTLPs }] : []),
    { text: 'Dev Log',  copySet: stats.uniqueDLGs },
    { text: 'QAN',      copySet: stats.uniqueQANs },
    { text: 'PRJ',      copySet: stats.uniquePRJs },
    ...(groupByXds ? [{ text: 'XDS',     copySet: stats.uniqueXDSs }] : []),
    { text: 'Hours',    copySet: null },
    { text: descHeader, copySet: null },
  ];

  for (const spec of headerSpecs) {
    const th = document.createElement('th');
    th.appendChild(document.createTextNode(spec.text));
    if (spec.copySet?.size! > 0) {
      const icon = document.createElement('wa-icon') as WaIcon;
      icon.setAttribute('name', 'copy');
      icon.className = 'header-copy-icon';
      th.appendChild(icon);
    }
    tr.appendChild(th);
  }

  thead.appendChild(tr);
  return thead;
}

function buildTableBody(entries: Entry[], showAllDescriptions: boolean, groupByXds: boolean, groupByTlp: boolean) {
  const tbody = document.createElement('tbody');

  for (const entry of entries) {
    const tlpCode = +entry.tlpCode;
    if (!tlpCode) continue;

    const hours = entry.totalSeconds / 3600;
    const hoursRounded = Math.round(hours * 4) / 4;
    if (hoursRounded <= 0) continue;

    const rows = buildEntryRows(entry, hoursRounded, showAllDescriptions, groupByXds, groupByTlp);
    for (const row of rows) {
      tbody.appendChild(row);
    }
  }

  return tbody;
}

function buildTableFoot(stats: TimecardStats, groupByXds: boolean, groupByTlp: boolean) {
  const tfoot = document.createElement('tfoot');
  const tr = document.createElement('tr');

  // Count cells (matching column order in header)
  const countValues = [
    ...(groupByTlp ? [stats.uniqueTLPs.size] : []),
    stats.uniqueDLGs.size,
    stats.uniqueQANs.size,
    stats.uniquePRJs.size,
    ...(groupByXds ? [stats.uniqueXDSs.size] : []),
    stats.totalRoundedHours.toFixed(2),
    `${stats.uniqueDescriptions.size}   (distinct entities)`,
  ];

  for (const val of countValues) {
    const td = document.createElement('td');
    td.textContent = val !== null && val !== undefined ? String(val) : '';
    tr.appendChild(td);
  }

  tfoot.appendChild(tr);
  return tfoot;
}

// ### Row Builders ###

/**
 * Builds one or more <tr> elements for a single grouped timecard entry.
 * Returns an array: first element is the main row, subsequent are description continuation rows.
 */
function buildEntryRows(entry: Entry, hoursRounded: number, showAllDescriptions: boolean, groupByXds: boolean, groupByTlp: boolean) {
  const tlpCode = +entry.tlpCode;

  // Collect distinct descriptions for this entry
  const descSet = new Set<string>();
  for (const e of entry.entries) {
    if (e.description) descSet.add(e.description);
  }
  const descriptions = Array.from(descSet).sort();

  // Main row
  const mainRow = document.createElement('tr');
  if (groupByTlp) mainRow.appendChild(createCodeCell(tlpCode));
  mainRow.appendChild(createCodeCell(entry.dlgNumber));
  mainRow.appendChild(createCodeCell(entry.qanNumber));
  mainRow.appendChild(createCodeCell(entry.prjNumber));
  if (groupByXds) mainRow.appendChild(createCodeCell(entry.xdsNumber));
  mainRow.appendChild(createHoursCell(hoursRounded));
  mainRow.appendChild(createDescCell(descriptions[0]));

  const rows = [mainRow];

  // Subsequent description rows (only when showAllDescriptions is enabled)
  if (showAllDescriptions) {
    for (let i = 1; i < descriptions.length; i++) {
      rows.push(buildSubsequentRow(entry, descriptions[i], groupByXds, groupByTlp));
    }
    // Mark the last row of this group so CSS can draw a thick divider between groups
    rows[rows.length - 1].classList.add('group-end');
  }

  return rows;
}

/**
 * Builds a continuation row for an additional description line.
 * Code columns show a continuation marker if the entry has that code.
 */
function buildSubsequentRow(entry: Entry, description: string, groupByXds: boolean, groupByTlp: boolean) {
  const tr = document.createElement('tr');
  tr.className = 'subsequent-row';

  const continuationMarker = '↳';
  const emptyCell = () => { const td = document.createElement('td'); return td; };
  const markerCell = (hasValue: boolean) => {
    const td = document.createElement('td');
    if (hasValue) td.textContent = continuationMarker;
    return td;
  };

  if (groupByTlp) tr.appendChild(markerCell(!!entry.tlpCode));
  tr.appendChild(markerCell(!!entry.dlgNumber));
  tr.appendChild(markerCell(!!entry.qanNumber));
  tr.appendChild(markerCell(!!entry.prjNumber));
  if (groupByXds) tr.appendChild(markerCell(!!entry.xdsNumber));
  tr.appendChild(emptyCell()); // Hours column — empty for continuation rows
  tr.appendChild(createDescCell(description));

  return tr;
}

// ### Cell Builders ###

/**
 * Creates a <td> containing a code value and a <wa-copy-button>.
 * If code is falsy, returns an empty <td>.
 */
function createCodeCell(code: any) {
  const td = document.createElement('td');
  if (code) {
    const wrapper = document.createElement('span');
    wrapper.className = 'code-cell';

    const label = document.createElement('span');
    label.textContent = String(code);

    const copyBtn = document.createElement('wa-copy-button') as WaCopyButton;
    copyBtn.setAttribute('value', String(code));

    wrapper.appendChild(label);
    wrapper.appendChild(copyBtn);
    td.appendChild(wrapper);
  }
  return td;
}

function createHoursCell(hours: number) {
  const td = document.createElement('td');
  td.textContent = hours % 1 === 0 ? String(hours) : hours.toFixed(2);
  return td;
}

function createDescCell(text: string) {
  const td = document.createElement('td');
  td.textContent = text || '';
  return td;
}
