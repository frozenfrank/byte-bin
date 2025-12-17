#!/bin/bash

# Executes a proof-of-concept test of Toggl API access.
# Inputs: TOKEN (required), WORKSPACE_ID (optional)

# Verify that TOKEN is set
if [ -z "$TOKEN" ]; then
   >&2 echo "Error: TOKEN must be set to your Toggle API token."
  exit 1
fi

# Test Toggl API access, reusing cached me.json if it exists
if [ ! -f "me.json" ]; then
  echo "Retrieving user info from Toggl API into me.json..."
  curl -u $TOKEN:api_token https://api.track.toggl.com/api/v9/me > me.json
  if [ $? -ne 0 ]; then
    >&2 echo "Error: Unable to access Toggl API. Please check your TOKEN."
    exit 1
  fi
fi

echo "Welcome," $(cat me.json | jq -r '.fullname')

# Default WORKSPACE_ID if not provided
if [ -z "$WORKSPACE_ID" ]; then
  WORKSPACE_ID=$(cat me.json | jq -r '.default_workspace_id')
fi
if [ -z "$WORKSPACE_ID" ]; then
  >&2 echo "Error: WORKSPACE_ID is not set and could not be determined from the API."
  exit 1
fi
echo "Using WORKSPACE_ID: $WORKSPACE_ID"

# Test fetching time entries
# Including meta=true to get readable info like project names and client names
echo -e "\nFetching time entries into time_entries.json..."
curl  "https://api.track.toggl.com/api/v9/me/time_entries?meta=true&start_date=2025-11-01&end_date=2025-12-01" \
  -H "Content-Type: application/json" \
  -u $TOKEN:api_token > time_entries.json

# Test fetching projects
echo -e "\nFetching active projects for workspace $WORKSPACE_ID into projects.json..."
curl  https://api.track.toggl.com/api/v9/workspaces/$WORKSPACE_ID/projects?active=true \
  -H "Content-Type: application/json" \
  -u $TOKEN:api_token > projects.json
