import { ISO8601DateString } from "../model/types";

/** Data received from the /me endpoint. */
export interface TogglProfileData {
  "id": 2498657,
  "api_token": string;
  "email": string;
  "fullname": string;
  "timezone": string; // "America/Chicago",
  "2fa_enabled": boolean,
  "toggl_accounts_id": string,
  "default_workspace_id": number,
  "beginning_of_week": number,
  "image_url": string, // "https://assets.track.toggl.com/images/profile.png",
  "created_at": ISO8601DateString,
  "updated_at": ISO8601DateString,
  "openid_email": string|null,
  "openid_enabled": boolean,
  "country_id": unknown|null,
  "has_password": boolean,
  "at": ISO8601DateString,
  "oauth_providers": string[]; // ["google", "apple"],
  "authorization_updated_at": ISO8601DateString;
}
