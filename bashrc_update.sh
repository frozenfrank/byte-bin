#!/usr/bin/env bash

DOTFILES_DIR="$HOME/.dotfiles"

# Check for updates
if [ -d "$DOTFILES_DIR" ]; then
    (
        cd "$DOTFILES_DIR" &&
        git pull --quiet
    ) &
fi
