
// ### Unified Time Entry Type ###

/** The set of all time entries received from the data source. */
export interface TimeEntryData<T> {
  hasClientData: boolean;
  hasBillableData: boolean;
  entries: TimeEntry<T>[];
}

/** A unified time entry used within the application. */
export interface TimeEntry<T> {
  description: string;
  start: Date;
  stop: Date|null;
  durationSeconds: number|null;
  projectName: string;
  clientName?: string;
  tagNames: string[];
  billable?: boolean;
  userName: string;
  original: T;
}

// ### Types from Toggle API ###

export type TimeEntryId = number;
export type UserId = number;
export type WorkspaceId = number;
export type ProjectId = number;
export type TaskId = number;
export type TagId = number;

/** Ex: 2025-11-27T01:07:34+00:00 */
export type ISO10DateString = string;

/** A time entry received from Toggl's /v9/me/time_entries?meta=true endpoint. */
export interface TogglAPITimeEntryWithMetadata {
  "id": TimeEntryId;
  "workspace_id": WorkspaceId;
  "project_id": ProjectId;
  "task_id": TaskId;
  "billable": boolean;
  "start": ISO10DateString;
  "stop": ISO10DateString;
  /** Time entry duration in seconds. For running entries should be negative, preferable -1 */
  "duration": number;
  /** User entered time entry description */
  "description": string;
  "tags": string[];
  "tag_ids": TagId[];
  /** 	Used to create a TE with a duration but without a stop time, this field is deprecated for GET endpoints where the value will always be true. */
  "duronly": boolean;
  /** When was last updated, the field follows the ISO 8601 format (HH:mm:ss.ssssssZ) */
  "at": ISO10DateString;
  "server_deleted_at": ISO10DateString|null;
  "user_id": UserId;
  "uid": number;
  "wid": number;
  "pid": number;
  /** Display ready name of the client associated with the project. */
  "client_name": string;
  /** Display ready name of the project. */
  "project_name": string;
  /** HTML Color associated with the project. Ex: #e31c79 */
  "project_color": string;
  "project_active": boolean;
  "project_billable": boolean;
  /** Full name of the owning user */
  "user_name": string;
  "user_avatar_url": string|"";
}

// ### Types from Toggl Export CSV ###

/** A time entry exported from Toggl in CSV format. */
export interface TogglExportTimeEntry {
  "Description": string;
  "Billable"?: "Yes"|"No";
  "Client"?: string;
  /** H:mm:ss. Ex: 0:27:12 */
  "Duration": string;
  /** User display name */
  "Member": string;
  "Email"?: string;
  "Project": string;
  /** Comma separated list of tags */
  "Tags": string;
  /** YYYY-mm-dd */
  "Start date": string;
  /** hh:mm:ss */
  "Start time": string;
  /** YYYY-mm-dd */
  "Stop date": string;
  /** hh:mm:ss */
  "Stop time": string;
}
