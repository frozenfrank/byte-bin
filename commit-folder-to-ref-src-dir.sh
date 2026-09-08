#!/bin/bash

# 1. Check if both required arguments were provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Error: Missing arguments."
    echo "Usage: $0 /path/to/folder <git-ref>"
    echo "Example: $0 /path/to/folder refs/heads/main"
    exit 1
fi

TARGET_DIR="$1"
GIT_REF="$2"
PLACEMENT_DIR="src"

# 2. Verify that the first argument is a valid directory
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: '$TARGET_DIR' is not a valid directory."
    exit 1
fi

# 3. Use Git to validate that the ref exists
# --verify requires the full ref path (e.g., refs/heads/main, refs/tags/v1.0)
if ! git show-ref --verify --quiet "$GIT_REF"; then
    echo "Error: Git ref '$GIT_REF' does not exist in this repository."
    exit 1
fi

# 4. Enable nullglob so the loop doesn't run if the folder is empty
PREV_SHA=$(git rev-parse $GIT_REF)
shopt -s nullglob
TEMP_INDEX_FILE=$(mktemp)
export GIT_INDEX_FILE=$TEMP_INDEX_FILE
git read-tree "$PREV_SHA^{tree}"
git ls-files -z "$PLACEMENT_DIR" | git update-index  --force-remove -z --stdin

# 5. Loop through every item inside the directory
for file in "$TARGET_DIR"/*; do
    # Ensure we are only processing files (skips subdirectories)
    if [ -f "$file" ]; then
        FILE_HASH=$(git hash-object -w $file)
        git update-index --add --cacheinfo 100644,$FILE_HASH,"$PLACEMENT_DIR/$(basename $file)"
    fi
done

if git diff-index --cached --quiet $GIT_REF; then
    # NOTE: There are situations where developers would appreciate the existence
    # of a snapshot in time capturing the current state of an environment...
    # even if that diff hadn't actually changed since the last snapshot.
    # This is feasible since the server files are not currently natively tracked in 'git'.
    # Consider including an 'epc fetch --always-commit' flag that would bypass this check;
    # Git offers the functionality in the porcelain layer with 'git commit --allow-empty'.
    echo "No changes to commit."
    unset GIT_INDEX_FILE
    rm -f $TEMP_INDEX_FILE
    exit 1
fi

TREE_HASH=$(git write-tree)
COMMIT_HASH=$(git commit-tree $TREE_HASH -p $PREV_SHA -m "Programmatically generated from $TARGET_DIR")
unset GIT_INDEX_FILE
rm -f $TEMP_INDEX_FILE

git update-ref $GIT_REF $COMMIT_HASH $PREV_SHA || exit 1

git show --stat $COMMIT_HASH
