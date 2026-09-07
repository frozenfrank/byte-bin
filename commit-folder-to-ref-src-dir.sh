#!/bin/bash

# 1. Check if an argument was provided
if [ -z "$1" ]; then
    echo "Error: No folder provided."
    echo "Usage: $0 /path/to/folder"
    exit 1
fi

# 2. Verify that the argument is a valid directory
TARGET_DIR="$1"
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: '$TARGET_DIR' is not a valid directory."
    exit 1
fi

# 3. Enable nullglob so the loop doesn't run if the folder is empty
shopt -s nullglob

# 4. Loop through every item inside the directory
for file in "$TARGET_DIR"/*; do
    # Ensure we are only processing files (skips subdirectories)
    if [ -f "$file" ]; then
        echo "Processing: $file"
        
        # --------------------------------------------------------
        # PLACE YOUR CODE HERE
        # e.g., cat "$file", mv "$file" /dest/, or run a tool
        # Always wrap "$file" in double quotes to handle spaces safely!
        # --------------------------------------------------------
        
    fi
done

