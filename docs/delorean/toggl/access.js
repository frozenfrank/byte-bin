async function getTimeEntries(token,proxy) {
  // Fetch time entries from Toggl API
  let requestURL = "https://api.track.toggl.com/api/v9/me/time_entries";
  if (proxy) {
    requestURL = `${proxy}?url=${encodeURIComponent(requestURL)}`;
  }
  const response = await fetch(requestURL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${token}:api_token`,
    },
  });

  // Interpret response
  if (!response.ok) {
    const responseText = await response.text();
    if (responseText) console.error(responseText)
    throw new Error(`Error fetching time entries: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  console.log("Retrieved time entries:", data);
}
