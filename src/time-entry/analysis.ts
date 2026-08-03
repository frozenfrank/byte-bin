import { TimeEntry } from "./time-entry";
import { extractTLPCode, PRJ_REGEX } from "./time-entry-processing";

// ### Semantic Analysis Layer ###
// Layers higher-level categorization on top of the raw TimeEntry fields.
// Populated onto entry._analysis in processTimeEntryData (script.ts), parallel to _computedDates.
// Enums are regular (non-const) so their runtime reverse map (e.g. PrjType[value]) doubles as
// the chart label. All enum-member references live in this file.

export interface TimeEntryAnalysis {
  tlpType: TlpType,
  prjType: PrjType,
};

export enum TlpType {
  /** Directly connected to code. Ex: TLP 13, 14 */
  Coding,
  /** Directly connected to designs. Ex: TLP 12, 16 */
  Design,
  /** Meetings. Ex: TLP 7091 */
  Meeting,
  /** Dealing with fixes. Ex: TLP 13279, 5513 */
  Fixes,
  /** Immersion/travel. Ex: TLP 3048, 20239, 47818, 57064 */
  Research,
  /** Catch all for everything else. Ex: TLP 4, 3, 154, 119, 47808 */
  Other,
}

export enum PrjType {
  "My Project",
  "Cred Prj",
  "Other Prj",
  "Non-Prj",
}

/** Bucket an entry's TLP code (5-digit zero-padded, from {@linkcode extractTLPCode}) into a TlpType. */
function classifyTlpType(entry: TimeEntry): TlpType {
  switch (extractTLPCode(entry)) {
    case "00013": case "00014":                             return TlpType.Coding;
    case "00012": case "00016":                             return TlpType.Design;
    case "07091":                                           return TlpType.Meeting;
    case "13279": case "05513":                             return TlpType.Fixes;
    case "03048": case "20239": case "47818": case "57064": return TlpType.Research;
    default:                                                return TlpType.Other; // incl. null (no TLP tag)
  }
}

/** Bucket an entry into a PrjType based on where (and whether) a PRJ number appears. */
function classifyPrjType(entry: TimeEntry): PrjType {
  if (PRJ_REGEX.test(entry.projectName)) {
    return PrjType["My Project"];
  }

  if (PRJ_REGEX.test(entry.description)) {
    return /cred/i.test(entry.projectName) ? PrjType["Cred Prj"] : PrjType["Other Prj"];
  }

  return PrjType["Non-Prj"];
}

/** Compute the full analysis payload for an entry, delegating to the per-field classifiers. */
export function analyzeTimeEntry(entry: TimeEntry): TimeEntryAnalysis {
  return {
    tlpType: classifyTlpType(entry),
    prjType: classifyPrjType(entry),
  };
}
