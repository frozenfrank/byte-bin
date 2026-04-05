# dotfiles

This branch of the poly repo contains shared dot files for syncing configuration across multiple machines.

**Available files:**
* [`.bash_aliases`](./.bash_aliases)

## Installation

### Automatic (Recommended)

Run the following command on a new machine:

```shell
curl -fsSL https://raw.githubusercontent.com/frozenfrank/byte-bin/dotfiles/install.sh | bash
```

The install script will:
1. Clone a single branch of the repository into `~/.dotfiles`
2. Add a hook to `~/.bashrc` to auto-update when changes are made
3. Add a hook to `~/.bash_profile` to load aliases in every new session

#### Not using `bash`?

Add the following line to your shell's startup script (`~/.zshrc`, etc.):

```shell
[[ -f ~/.bashrc ]] && . ~/.bashrc
```

### Manual

Copy (or symlink) [`.bash_aliases`](./.bash_aliases) to `~/.bash_aliases`.

To load the aliases into your current session without restarting, run:

```shell
source ~/.bash_aliases
```

Many configurations already include a line in `~/.bash_profile` that automatically imports `~/.bash_aliases` if it exists — in that case, simply restarting your terminal is enough.

For other shells (zsh, ksh, git-bash, etc.), the aliases file may need to be in a different location. You can either move/symlink the file there, or add the following line to your shell's startup script:

```shell
source ~/.bash_aliases
```
