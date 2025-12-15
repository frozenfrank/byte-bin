const TOGGL_BASE_URL = "https://api.track.toggl.com/api/v9"
const DEFAULT_PROXY_URL = "https://proxy-fjuhi57saa-uc.a.run.app";


/**
 * Queries Toggl's /me endpoint to view basic information about the user associated with the token.
 *
 * @param {string} token A Toggl API token
 * @returns Promise<TogglProfileData> An object containing data about the signed in user
 */
function getProfile(token) {
  if (!token) {
    throw new Error("Missing required parameter.");
  }

  return makeTogglRequest("GET","/me",token);
}

/**
 * Queries Toggl's /me/time_entries endpoint which lists out all time entries within a date range.
 *
 * @param {string} token A Toggl API token
 * @param {Date} startDate The first day of data to include in the query
 * @param {Date} endDate Inclusive. The last day of data to include in the query
 * @param {boolean} [includeMetaInformation=true] When true, additional information like entity names will be included in the output, instead of requiring separate queries to lookup IDs.
 * @returns Toggl's Time Entry data output
 */
function getTimeEntries(token,startDate,endDate=new Date,includeMetaInformation=true) {
  if (!token || !startDate || !endDate) {
    throw new Error("Missing required parameter.");
  }

  const parameters = [
    `meta=${!!includeMetaInformation}`,
    `start_date=${formatDate(startDate)}`,
    `end_date=${formatDate(endDate)}`,
  ];
  return makeTogglRequest("GET",`/me/time_entries?${parameters.join("&")}`,token);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

async function makeTogglRequest(method,endpoint,usernameOrToken,password="api_token",proxyUrl=DEFAULT_PROXY_URL) {
  // Prepare request URL
  let requestURL = TOGGL_BASE_URL+endpoint;
  if (proxyUrl) {
    requestURL = `${proxyUrl}?url=${encodeURIComponent(requestURL)}`;
  }

  // Prepare auth header
  const authHeader = "Basic " + btoa(usernameOrToken + ":" + password);

  // Execute request
  const response = await fetch(requestURL, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
    },
  });

  // Interpret response
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Error making Toggl request (${response.status} ${response.statusText}): ${responseText}`);
  }
  const data = await response.json();
  return data;
}
