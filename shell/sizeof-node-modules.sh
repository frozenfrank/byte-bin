#!/bin/bash

# Take in a directory from the commandline
DIR=${1:-$PWD}

# Verify that the directory exists
if [ -d "$DIR" ]; then
    echo "Calculating size of all node_modules/ directories within $DIR"
else
    echo "Error: Directory $DIR does not exist."
    exit 1
fi

# Run the pipeline command
find $DIR -type d -name "node_modules" -prune -print0 | \
xargs -0 du -hs | \
sort -hr
