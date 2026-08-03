import { formatDuration } from './helper';
import type { WaCallout, WaDetails, WaIcon } from './model/web-awesome';
import type { TlpAuditFinding, TlpAuditIssue, TlpAuditSeverity } from './time-entry/tlp-audit';
import { ISSUE_SEVERITY, mostSevereSeverity, severitiesPresent } from './time-entry/tlp-audit';

// Renders the TLP audit findings for the "Filter Entries" tab. Built imperatively
// with textContent (never innerHTML) because every cell holds user-authored text
// and this codebase has no HTML-escaping utility. See report.ts for the pattern.

const ISSUE_LABELS: Record<TlpAuditIssue, string> = {
  'tlp-missing': 'No TLP tag',
  'tlp-mismatch': 'Tag ≠ description',
};

// Web Awesome names its error variant "danger" and its informational variant
// "brand" — there is no `error`/`info` variant to reach for.
// `octagon-exclamation` (the literal stop sign) is Font Awesome Pro; this project
// has no kit code, so it would 403. `circle-exclamation` is the free equivalent.
const SEVERITY_PRESENTATION: Record<TlpAuditSeverity, { variant: string; icon: string }> = {
  error:   { variant: 'danger',  icon: 'circle-exclamation' },
  warning: { variant: 'warning', icon: 'triangle-exclamation' },
  info:    { variant: 'brand',   icon: 'circle-info' },
};

/**
 * Builds the audit callout and the collapsible table of flagged entries. The
 * callout takes on the most severe severity present.
 * Returns `null` when there is nothing to report.
 */
export function buildTlpAuditElement(findings: TlpAuditFinding[]): HTMLElement|null {
  if (!findings.length) return null;

  const container = document.createElement('div');
  container.className = 'wa-stack';
  container.appendChild(buildAuditCallout(findings));
  container.appendChild(buildAuditDetails(findings));

  return container;
}

function buildAuditCallout(findings: TlpAuditFinding[]) {
  // Non-null: buildTlpAuditElement() already bailed out on an empty findings list.
  const { variant, icon: iconName } = SEVERITY_PRESENTATION[mostSevereSeverity(findings)!];

  const callout = document.createElement('wa-callout') as WaCallout;
  callout.setAttribute('variant', variant);
  callout.setAttribute('size', 's');

  const icon = document.createElement('wa-icon') as WaIcon;
  icon.setAttribute('slot', 'icon');
  icon.setAttribute('name', iconName);
  callout.appendChild(icon);

  const headline = document.createElement('strong');
  headline.textContent = `${findings.length} ${pluralizeEntries(findings.length)} flagged by the TLP audit`;
  callout.appendChild(headline);

  callout.appendChild(document.createElement('br'));
  callout.appendChild(document.createTextNode(summarizeIssues(findings)));

  return callout;
}

const ISSUE_SUMMARIES: Record<TlpAuditIssue, (count: number) => string> = {
  'tlp-missing': n => `${n} with no TLP tag`,
  'tlp-mismatch': n => `${n} where the description disagrees with the tag`,
};

/**
 * Describes only the issue kinds actually present, most severe first,
 * e.g. "3 with no TLP tag · 1 where the description disagrees with the tag".
 */
function summarizeIssues(findings: TlpAuditFinding[]): string {
  const counts = new Map<TlpAuditIssue, number>();
  for (const { issue } of findings) counts.set(issue, (counts.get(issue) ?? 0) + 1);

  // Grouped by severity so errors always lead, then by the issue order within each.
  return severitiesPresent(findings)
    .flatMap(severity => [...counts]
      .filter(([issue]) => ISSUE_SEVERITY[issue] === severity)
      .map(([issue, count]) => ISSUE_SUMMARIES[issue](count)))
    .join(' · ');
}

function buildAuditDetails(findings: TlpAuditFinding[]) {
  const details = document.createElement('wa-details') as WaDetails;
  details.setAttribute('summary', `Show ${findings.length} flagged ${pluralizeEntries(findings.length)}`);
  details.appendChild(buildAuditTable(findings));

  return details;
}

function buildAuditTable(findings: TlpAuditFinding[]) {
  const table = document.createElement('table');
  table.className = 'tlp-audit-table wa-zebra-rows wa-hover-rows';

  table.appendChild(buildAuditTableHead());
  table.appendChild(buildAuditTableBody(findings));

  return table;
}

function buildAuditTableHead() {
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');

  for (const text of ['Issue', 'Description', 'Date & Time', 'Duration', 'Tags', 'Project']) {
    const th = document.createElement('th');
    th.textContent = text;
    tr.appendChild(th);
  }

  thead.appendChild(tr);
  return thead;
}

function buildAuditTableBody(findings: TlpAuditFinding[]) {
  const tbody = document.createElement('tbody');

  for (const finding of findings) {
    const { entry } = finding;
    const tr = document.createElement('tr');

    tr.appendChild(createCell(
      ISSUE_LABELS[finding.issue],
      `audit-issue-cell audit-severity-${ISSUE_SEVERITY[finding.issue]}`));
    tr.appendChild(createCell(entry.description, 'audit-description-cell'));
    tr.appendChild(createCell(formatStartDateTime(entry.start)));
    tr.appendChild(createCell(entry.durationSeconds === null ? '—' : formatDuration(entry.durationSeconds)));
    tr.appendChild(createCell(entry.tagNames?.join(', ') || '—'));
    tr.appendChild(createCell(entry.projectName || '—'));

    tbody.appendChild(tr);
  }

  return tbody;
}

function createCell(text: string, className?: string) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function formatStartDateTime(start: Date): string {
  if (isNaN(+start)) return '—';
  return start.toLocaleString('default', { dateStyle: 'medium', timeStyle: 'short' });
}

function pluralizeEntries(count: number): string {
  return count === 1 ? 'entry' : 'entries';
}
