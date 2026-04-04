#!/usr/bin/env bash

DOTFILES_DIR="$HOME/.dotfiles"

# Check for updates
if [ -d "$DOTFILES_DIR" ]; then
    PREV_HASH=$(git -C "$DOTFILES_DIR" rev-parse HEAD)
    git -C "$DOTFILES_DIR" pull --quiet
    NEW_HASH=$(git -C "$DOTFILES_DIR" rev-parse HEAD)

    if [ "$PREV_HASH" != "$NEW_HASH" ]; then
        echo "Changes detected! A pull occurred."
        source "$DOTFILES_DIR/bashrc.sh"
    fi
fi
