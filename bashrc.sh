#!/usr/bin/env bash

DOTFILES_DIR="$HOME/.dotfiles"

# Check for updates
if [ -d "$DOTFILES_DIR" ]; then
    cd "$DOTFILES_DIR"

    PREV_HASH=$(git rev-parse HEAD)
    git pull --quiet
    NEW_HASH=$(git rev-parse HEAD)

    if [ "$PREV_HASH" != "$NEW_HASH" ]; then
        echo "Changes detected! A pull occurred."
        source bashrc.sh
    fi
fi
