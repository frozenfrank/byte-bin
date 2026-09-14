# Usage: source reproduction-exit.sh
START_DIR=$(cat .START_DIR)
if [ -z "$START_DIR" ]; then
    echo "Unable to return to the original directory. No START_DIR specified."
    exit 1
fi

TEMP_DIR=$(pwd)
cd "$START_DIR"
rm -rf "$TEMP_DIR"

echo "Returned to start directory and cleaned up temp repo."
