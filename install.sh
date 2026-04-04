#!/usr/bin/env bash

set -e

REPO_URL="https://github.com/frozenfrank/byte-bin.git"
INSTALL_DIR="$HOME/.dotfiles"
ALIASES_FILE="$INSTALL_DIR/.bash_aliases"
TARGET_FILE="$HOME/.bash_aliases"

echo "Installing dotfiles..."

# Clone if not already installed
if [ ! -d "$INSTALL_DIR" ]; then
    git clone --single-branch --branch dotfiles "$REPO_URL" "$INSTALL_DIR"
else
    echo "Repo already exists. Pulling latest changes..."
    git -C "$INSTALL_DIR" pull
fi

# Symlink .bash_aliases
if [ -f "$TARGET_FILE" ] || [ -L "$TARGET_FILE" ]; then
    rm "$TARGET_FILE"
fi

ln -s "$ALIASES_FILE" "$TARGET_FILE"

echo "Done! Reload your shell or run: source ~/.bashrc"
