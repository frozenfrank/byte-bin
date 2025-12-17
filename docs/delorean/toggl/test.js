async function test(usePassword,showData,proxy) {
  const authHeader = getAuthHeader(usePassword);
  console.log("Auth Header:", authHeader);

  let requestURL = "https://api.track.toggl.com/api/v9/me/time_entries";
  if (proxy) {
    requestURL = `${proxy}?url=${encodeURIComponent(requestURL)}`;
  }
  const response = await fetch(requestURL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
    }
  })
  console.log("Response", response,"\n\n");

  if (!response.ok) {
    const responseText = await response.text();
    console.error("Response Text", responseText);
    throw new Error(`Error fetching time entries: ${response.status} ${response.statusText}`);
  } else {
    console.log("Response OK");
    const data = await response.text();
    if (showData) {
      console.log("Data", data);
    } else {
      console.log("Partial data", data.slice(0,100))
    }
  }
}

function getAuthHeader(usePassword) {
  const username = '';
  const password = '';
  const token = '';
  if (!username || !password || !token) {
    throw new Error("Missing authentication information. Provide the username/password and token fields.");
  }

  // Encode username and password
  const base64String = base64Encode(username + ':' + password);
  return usePassword ?
    `Basic ${base64String}` :
    `Basic ${token}:api_token`;
}


function base64Encode(string) {
  const buffer = Buffer.from(string, 'utf8');
  return buffer.toString('base64');
}
