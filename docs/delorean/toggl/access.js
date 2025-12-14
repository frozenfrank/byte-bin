async function getTimeEntries(token) {
  const response = await fetch("https://api.track.toggl.com/api/v9/me/time_entries", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${token}:api_token`,
    },
  });
  const data = await response.json();
  console.log("Retrieved time entries:", data);
}
