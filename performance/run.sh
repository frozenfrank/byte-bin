#!/bin/bash
# Usage: ./performance/run.sh <platform>
#
# Runs reproduction-performance.sh 10 times and captures each trial to
# performance/results/<platform>/1.txt .. 10.txt, where <platform> names
# the machine the trials ran on (for example macos, wsl, or windows).
# Keeping each platform in its own folder is what lets analyze.sh
# average and compare them.
#
# Run this from the repository root; the paths below are relative to it.

PLATFORM="$1"
if [ -z "$PLATFORM" ]; then
  echo "Usage: $0 <platform>" >&2
  echo "  <platform> is the results folder name, e.g. macos, wsl, windows" >&2
  exit 1
fi

RESULTS_DIR="performance/results/$PLATFORM"
mkdir -p "$RESULTS_DIR"
for i in {1..10}; do echo "Trial #$i"; ./reproduction-performance.sh > "$RESULTS_DIR/$i.txt" 2>&1; done
