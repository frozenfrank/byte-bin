# dotfiles

This branch in the poly repo contains useful dot files for sharing config across multiple machines.

Available files:
* [`.bash_aliases`](./.bash_aliases)

## Usage

## Automatic Installation

Execute the following command on a new machine:

```shell
curl -fsSL https://raw.githubusercontent.com/frozenfrank/byte-bin/dotfiles/install.sh | bash
```

The install script will:
1. Clone a single branch of the repository into `~/.dotfiles`
2. Insert a hook into the `~/.bashrc` to auto-update with changes.
3. Insert a hook into the `~/.bash_profile` to ensure every session has the aliases.


### Not using `bash`?

Add the following line of code to your terminal's startup script (`~/.zshrc`, etc):

```shell
[[ -f ~/.bashrc ]] && . ~/.bashrc
```

## Manual Installation

To install, copy (or symlink) [`.bash_aliases`](./.bash_aliases) file into `~/.bash_aliases`.

At any point, you can enter `source ~/.bash_aliases` to pull in all the shortcuts to the terminal session.

Some configurations have a have a line of code in the `~/.bash_profile` file that imports `~/.bash_aliases` if it exists.
Restart the terminal to view the changes, or `source ~/.bash_aliases`.
Other shells (zsh, ksh, git-bash, etc) may require the file in a different location;
either copy or symlink or directly reference your main file from the location
your shell is expecting by adding a `source ~/.bash_aliases` in the other file.
