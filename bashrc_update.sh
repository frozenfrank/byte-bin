#!/usr/bin/env bash

DOTFILES_DIR="$HOME/.dotfiles"
STAMP_FILE="$DOTFILES_DIR/.last_pull"

# Only run once per day
if [ -d "$DOTFILES_DIR" ]; then
    if [ ! -f "$STAMP_FILE" ] || [ "$(find "$STAMP_FILE" -mtime +1 2>/dev/null)" ]; then
        (
            cd "$DOTFILES_DIR" &&
            git pull --quiet &&
            date > "$STAMP_FILE"
        ) &
    fi
fi
