#!/bin/bash

# Check if the correct number of arguments is provided
if [ "$#" -ne 2 ]; then
    echo "Requires alisma to be installed: https://eclecticlight.co/2020/09/01/using-finder-aliases-from-the-command-line-with-alisma-a-new-universal-binary/"
    echo "Resolves all Finder Aliases in <source_directory> and copies them into <destination_directory>."
    echo "Usage: $0 <source_directory> <destination_directory>"
    exit 1
fi

# Assign command-line arguments to variables
SOURCE_DIRECTORY="$1"
DESTINATION_DIRECTORY="$2"

# Create the destination directory if it doesn't exist
mkdir -p "$DESTINATION_DIRECTORY"

# Loop through each file in the source directory
for file in "$SOURCE_DIRECTORY"/*; do
    if [ -f "$file" ]; then  # Check if it is a file
	REAL_PATH=$(alisma -p "$file" 2> /dev/null)
        if [ "$REAL_PATH" = "-1" ]; then
            continue;
        fi
        echo "Exporting $REAL_PATH"
        cp "$REAL_PATH" "$DESTINATION_DIRECTORY"
#        echo "Copied $file to $DESTINATION_DIRECTORY"
    fi
done

