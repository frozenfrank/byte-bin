#!/usr/bin/env bash
# Usage: ./performance/analyze.sh [results-dir] [output-file]
#
# Summarizes the timings captured by reproduction-performance.sh.
# Each result file holds 8 'real' lines: 4 for the improved build
# (initial + 3 re-inits) followed by 4 for the original build.

RESULTS_DIR="${1:-performance/results}"
OUTPUT_FILE="${2:-performance/results-summary.txt}"

# Pull the 8 'real' lines out of one result file and print them as
# plain seconds, one per line.
extract_times() {
  local file="$1"
  grep real "$file" | awk '
    {
      time = $NF
      sub(/s$/, "", time)
      split(time, parts, "m")
      if (length(parts) > 1)
        seconds = parts[1] * 60 + parts[2]
      else
        seconds = parts[1]
      printf "%.6f\n", seconds
    }
  '
}

# Reduce one file to the four numbers of interest:
# improved-initial, improved-reinit, original-initial, original-reinit.
analyze_file() {
  local file="$1"
  extract_times "$file" | awk -v file="$file" '
    { times[NR] = $1 }
    END {
      if (NR != 8) {
        printf "skipping %s: expected 8 timings, found %d\n", file, NR > "/dev/stderr"
        exit 1
      }
      improvedInitial = times[1]
      improvedReinit  = (times[2] + times[3] + times[4]) / 3
      originalInitial = times[5]
      originalReinit  = (times[6] + times[7] + times[8]) / 3
      printf "%.6f %.6f %.6f %.6f\n", improvedInitial, improvedReinit, originalInitial, originalReinit
    }
  '
}

# Average every file in one platform folder and append a report section.
analyze_platform() {
  local dir="$1"
  local platform
  platform="$(basename "$dir")"

  local file
  for file in "$dir"/*; do
    [ -f "$file" ] || continue
    analyze_file "$file"
  done | awk -v platform="$platform" '
    {
      improvedInitial += $1
      improvedReinit  += $2
      originalInitial += $3
      originalReinit  += $4
      files++
    }
    END {
      if (files == 0) {
        printf "Platform: %s\n  no result files found\n\n", platform
        exit
      }
      printf "Platform: %s (%d samples)\n", platform, files
      printf "  Avg Initial Run (Improved):       %.3fs\n", improvedInitial / files
      printf "  Avg Reinitialization (Improved):  %.3fs\n", improvedReinit / files
      printf "  Avg Initial Run (Original):       %.3fs\n", originalInitial / files
      printf "  Avg Reinitialization (Original):  %.3fs\n", originalReinit / files
      printf "\n"
    }
  '
}

# Clear the output file, then report on every platform folder.
main() {
  : > "$OUTPUT_FILE"

  local dir
  for dir in "$RESULTS_DIR"/*/; do
    [ -d "$dir" ] || continue
    analyze_platform "$dir" >> "$OUTPUT_FILE"
  done

  cat "$OUTPUT_FILE"
}

main
