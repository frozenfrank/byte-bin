#!/usr/bin/env bash

set -e

REPO_URL="https://github.com/frozenfrank/byte-bin.git"
INSTALL_DIR="$HOME/.dotfiles"

BASHRC_FILE="$HOME/.bashrc"
BASH_PROFILE_FILE="$HOME/.bash_profile"

echo "Installing dotfiles..."

# Clone or update repo
if [ ! -d "$INSTALL_DIR" ]; then
    git clone --single-branch --branch dotfiles "$REPO_URL" "$INSTALL_DIR"
else
    echo "Repo exists. Pulling latest..."
    git -C "$INSTALL_DIR" pull
fi

# -----------------------------
# Insert into .bashrc (auto-update)
# -----------------------------
BASHRC_MARK="# >>> dotfiles bashrc >>>"
BASHRC_LINE='[ -f "$HOME/.dotfiles/bashrc.sh" ] && source "$HOME/.dotfiles/bashrc.sh"'

if ! grep -q "$BASHRC_MARK" "$BASHRC_FILE" 2>/dev/null; then
    echo "" >> "$BASHRC_FILE"
    echo "$BASHRC_MARK" >> "$BASHRC_FILE"
    echo "$BASHRC_LINE" >> "$BASHRC_FILE"
    echo "# <<< dotfiles bashrc <<<" >> "$BASHRC_FILE"
    echo "Added auto-update hook to .bashrc"
else
    echo ".bashrc already configured"
fi

# -----------------------------
# Insert into .bash_profile (aliases)
# -----------------------------
BASH_PROFILE_MARK="# >>> dotfiles bash_profile >>>"
BASH_PROFILE_LINE='[ -f "$HOME/.dotfiles/bash_profile.sh" ] && source "$HOME/.dotfiles/bash_profile.sh"'

if ! grep -q "$BASH_PROFILE_MARK" "$BASH_PROFILE_FILE" 2>/dev/null; then
    echo "" >> "$BASH_PROFILE_FILE"
    echo "$BASH_PROFILE_MARK" >> "$BASH_PROFILE_FILE"
    echo "$BASH_PROFILE_LINE" >> "$BASH_PROFILE_FILE"
    echo "# <<< dotfiles bash_profile <<<" >> "$BASH_PROFILE_FILE"
    echo "Added aliases hook to .bash_profile"
else
    echo ".bash_profile already configured"
fi

source "$BASH_PROFILE_FILE"
echo "Inspect the available commands at this file:"
echo "  $INSTALL_DIR/.bash_aliases"

echo ""
echo "Installed!"
