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
shopt -s nullglob
export GIT_INDEX_FILE=$(mktemp)
git read-tree "$GIT_REF^{tree}"
git ls-files -z -- "$PLACEMENT_DIR/" | xargs -0 git update-index --force-remove

# 5. Loop through every item inside the directory
for file in "$TARGET_DIR"/*; do
    # Ensure we are only processing files (skips subdirectories)
    if [ -f "$file" ]; then
        
        # --------------------------------------------------------
        # PLACE YOUR CODE HERE
        # --------------------------------------------------------
        FILE_HASH=$(git hash-object -w $file)        
        git update-index --add --cacheinfo 100644,$FILE_HASH,"$PLACEMENT_DIR/$(basename $file)"
    fi
done

TREE_HASH=$(git write-tree)
PREV_SHA=$(git rev-parse $GIT_REF)
COMMIT_HASH=$(git commit-tree $TREE_HASH -p $PREV_SHA -m "Programmatically generated from $TARGET_DIR")
unset GIT_INDEX_FILE

git update-ref $GIT_REF $COMMIT_HASH $PREV_SHA || exit 1

git show --stat $COMMIT_HASH
