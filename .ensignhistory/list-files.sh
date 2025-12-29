#! /bin/sh

list_files() {
    local dir="${1:-.}"
    local outfile="$dir/.dirlist"

    echo "Filename|Size|Last Modified" > $outfile
    for item in "$dir"/*; do
        if [ -e "$item" ]; then
            if [ -d "$item" ]; then
                # Recursively process subdirectories
                list_files "$item"
            else
                # Get filename, filesize, and last modified timestamp
                local filename=$(basename "$item")
                local filesize=$(stat -f%z "$item" 2>/dev/null || stat -c%s "$item" 2>/dev/null)
                local timestamp=$(stat -f%Sm -t%Y-%m-%d\ %H:%M:%S "$item" 2>/dev/null || stat -c%y "$item" 2>/dev/null | cut -d' ' -f1,2)

                echo "$filename|$filesize|$timestamp" >> $outfile
            fi
        fi
    done
}

list_files "$@"
