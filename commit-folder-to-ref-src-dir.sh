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

# 5. Loop through every item inside the directory
for file in "$TARGET_DIR"/*; do
    # Ensure we are only processing files (skips subdirectories)
    if [ -f "$file" ]; then
        echo "Processing: $file (Using Git Ref: $GIT_REF)"
        
        # --------------------------------------------------------
        # PLACE YOUR CODE HERE
        # --------------------------------------------------------
        
    fi
done
