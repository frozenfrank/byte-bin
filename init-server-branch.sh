#!/bin/bash

BRANCH="$1"
if [ -z "$BRANCH" ]; then
    echo "Error: Missing arguments."
    echo "Usage: $0 <remote_with_branch> [<initial_treeish>]"
    echo "Example: $0 env/861 my-initial-tree"
    exit 1
fi


BASE_TREE="${2:-test-initial-tree}"
REF_NAME="refs/remotes/$BRANCH"
INITIAL_COMMIT=$(git commit-tree $BASE_TREE -m "Root commit for $REF_NAME")
git update-ref $REF_NAME $INITIAL_COMMIT "" -m "Init server branch" || exit 1

git show --stat $INITIAL_COMMIT
