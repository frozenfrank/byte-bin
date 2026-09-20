# Usage: source reproduction-launch.sh
# Hint: It's necessary to 'source' this script so the current directory can be changed.

START_DIR=$(pwd)
NEW_DIR=$(mktemp -d)
git clone --single-branch --no-local . "$NEW_DIR"
cd "$NEW_DIR"
echo "$START_DIR" > .START_DIR
