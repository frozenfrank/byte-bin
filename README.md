# byte-bin
A collection of handy utility functions, scripts, and random coding snippets gathered over time.
From small code hacks to reusable features, this is the go-to bin for all those useful bytes of code!

## Installation
After cloning the repo, install the shell scripts on your `PATH` with the following:
```shell
export PATH="path/to/byte-bin/shell:$PATH"
```

This will allow your shell to autocomplete and run the scripts natively.

## Polyrepo - Managing multiple branches

Since this repository contains many independent branches, consider using the following specializations:

1. Only clone the main branch
	```shell
	git clone --single-branch git@github.com:frozenfrank/byte-bin.git
	```

1. Adjust `git fetch` behavior to only fetch some branches
    ```shell
	# View the current refspec setting
	git config --get-all remote.origin.fetch

    # Only fetch the main branch
	git config remote.origin.fetch "+refs/heads/main:refs/remotes/origin/main"
	```

1. Create alias to register newly created branches for updates
	```shell
	# Usage: `git pushu`. Behaves the same as `git push`, expect it also adds the current branch to the refspec for receiving updates.
	git config --global alias.pushu '!f() { branch="${1:-$(git rev-parse --abbrev-ref HEAD)}"; git push -u origin "$branch" && git config --add remote.origin.fetch "+refs/heads/$branch:refs/remotes/origin/$branch"; }; f'
	```

1. (Optional) Clean up extra branches
	```shell
	git branch -r | egrep -v 'main|YOUR_BRANCH_HERE' | xargs git branch -Dr
	```
