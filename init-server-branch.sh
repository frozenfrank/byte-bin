#!/bin/bash

BRANCH="$1"
if [ -z "$BRANCH" ]; then
    echo "Error: Missing arguments."
    echo "Usage: $0 <remote_with_branch> [<initial_treeish>]"
    echo "Example: $0 env/861 my-initial-tree"
    exit 1
fi


BASE_TREE="${2:-test-initial-tree}"
if ! git rev-parse --verify --quiet "$1^{tree}" >/dev/null 2>&1; then
    # This fallback value is known to exist because we merged it
    # into the history in 5a936b9e0a08c89d2532894cbec9ab929c59d2c3
    BASE_TREE="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
fi

# Override the default commit author information for the script.
# The "committer" will still be registered as the user who invoked the script using default 'git' logic.
# The author/committer date are left unspecified and will be populated with the current timestamp.
# Inspect these details in the final commit with: git show --format=fuller SHA
export GIT_AUTHOR_NAME="Init Branch Script"
export GIT_AUTHOR_EMAIL="devnull@example.com"

REF_NAME="refs/remotes/$BRANCH"
INITIAL_COMMIT=$(git commit-tree $BASE_TREE -m "Root commit for $REF_NAME")
git update-ref $REF_NAME $INITIAL_COMMIT "" -m "Init server branch" || exit 1

git show --stat $INITIAL_COMMIT
