#!/bin/bash

REMOTE="$1"
TARGET_DIR="$2"

# Verify that the first argument is a valid directory
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: '$TARGET_DIR' is not a valid directory."
    exit 1
fi

# Iterate over each ref in refs/remotes/epc
# NOTE: For this demonstrate, I loop over every server-tracking branch associated with the remote.
# In practice, this is a possibility, but the ref names themselves would need to encode the necessary
# information to know which environment to access (i.e. strictly require the format epc/env/861).
# Alternatively, the configuration for which refs to process and the mapping to their backing environments
# could live inside the workspace.json file instead, or inside the .git/config file.
while read -r ref; do
    (
        echo "Committing to $ref..."

        # NOTE: Clearly, in reality we would want to save off different sets of data to each branch.
        # This is where the EPC program should download the current state of *all* related files and
        # dump the results into a temporary directory somewhere.
        # Literally anywhere.
        #
        # It's a feature that the files don't have to be stored into a particular worktree; this
        # work can happen purely in the background and doesn't need to reserve any special files in
        # the user's working directory.

        # Save the results into the specified ref
        ./commit-folder-to-ref-src-dir.sh "$TARGET_DIR" "$ref" > /dev/null
        git show --oneline --decorate -s "$ref"

        # NOTE: This is where the temporary directory should be cleaned up.
        # It is no longer needed.
        # The contents of the directory are safely saved inside git and can be retrieved upon command.
    ) < /dev/null &
done < <(git for-each-ref --format='%(refname)' "refs/remotes/$REMOTE")

wait

echo "Finished committing to all refs in $REMOTE"
exit 0
