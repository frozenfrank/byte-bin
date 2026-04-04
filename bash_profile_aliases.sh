#!/usr/bin/env bash

ALIASES_FILE="$HOME/.dotfiles/.bash_aliases"

if [ -f "$ALIASES_FILE" ]; then
    source "$ALIASES_FILE"
fi
