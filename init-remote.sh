#!/bin/bash

REMOTE=$1
if [ -z "$REMOTE" ]; then
    echo "Error: Missing arguments."
    echo "Usage: $0 <remote>"
    echo "Example: $0 epc"
    exit 1
fi

# Register the remote so it's branches can be tracked as upstreams.
# However, direct it at /dev/null so that the branches cannot be PUSHED.
# The branches are intended to be PUBLISHED instead.
# Users are free to push the commits to other remotes.
# Users may consider using the 'remote.pushDefault' in git config to avoid pushing to this remote.
git remote add $REMOTE "file:///dev/null"
