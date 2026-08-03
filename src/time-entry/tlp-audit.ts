import type { TimeEntry } from './time-entry';
import { extractDescriptionTLPCode, extractTLPCode } from './time-entry-processing';

// Audits TLP codes on the filtered entries. The tag is the source of truth, but
// the description is expected to open with the same code as a data-entry
// convenience, so the two can silently drift apart.

export type TlpAuditIssue =
  /** The tags carry no TLP code at all. Reports drop these entries entirely. */
  | 'tlp-missing'
  /** The description opens with a TLP code that disagrees with the tag. */
  | 'tlp-mismatch';

/**
 * How much attention an issue deserves, ordered least → most severe.
 * `info` has no producer yet; it exists so a future low-stakes check can be
 * added without touching the presentation layer.
 */
export type TlpAuditSeverity = 'info' | 'warning' | 'error';

const SEVERITY_RANK: Record<TlpAuditSeverity, number> = { info: 0, warning: 1, error: 2 };

/** Severity is a property of the issue kind, not of the individual entry. */
export const ISSUE_SEVERITY: Record<TlpAuditIssue, TlpAuditSeverity> = {
  'tlp-missing': 'error',    // reports drop these entries entirely, so the timecard is wrong
  'tlp-mismatch': 'warning', // cosmetic drift; reports still come out correct
};

export interface TlpAuditFinding<T = unknown> {
  entry: TimeEntry<T>;
  issue: TlpAuditIssue;
  tagTlp: string|null;
  descriptionTlp: string|null;
}

/**
 * Flags entries whose TLP codes need attention, oldest first.
 * Returns an empty array when everything checks out.
 */
export function auditTlpCodes<T>(entries: TimeEntry<T>[]): TlpAuditFinding<T>[] {
  const findings: TlpAuditFinding<T>[] = [];

  for (const entry of entries) {
    const tagTlp = extractTLPCode(entry);
    const descriptionTlp = extractDescriptionTLPCode(entry);

    let issue: TlpAuditIssue|null = null;
    if (!tagTlp) {
      issue = 'tlp-missing';
    } else if (descriptionTlp && +descriptionTlp !== +tagTlp) {
      // Compared numerically: tag codes are zero-padded to 5 digits, descriptions are not.
      issue = 'tlp-mismatch';
    }

    if (issue) findings.push({ entry, issue, tagTlp, descriptionTlp });
  }

  return findings.sort((a, b) => +a.entry.start - +b.entry.start);
}

/** The distinct severities the findings carry, most severe first. */
export function severitiesPresent(findings: TlpAuditFinding[]): TlpAuditSeverity[] {
  const severities = new Set(findings.map(f => ISSUE_SEVERITY[f.issue]));
  return [...severities].sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a]);
}

/** The severity the whole audit should present as; `null` when nothing was flagged. */
export function mostSevereSeverity(findings: TlpAuditFinding[]): TlpAuditSeverity|null {
  return severitiesPresent(findings)[0] ?? null;
}
