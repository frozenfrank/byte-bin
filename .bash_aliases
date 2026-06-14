# Author: James Finlinson @frozenfrank 2026
# Source: https://github.com/frozenfrank/byte-bin/tree/dotfiles


# GIT history visualizations
alias log="git log --oneline"
alias graph="git log --oneline --graph"
alias graphall="git log --oneline --graph --all"
alias graphmain="git log --oneline --graph --first-parent"
alias graphhead="git log --oneline --graph --first-parent HEAD main"
alias graphimp="git log --oneline --graph --first-parent --branches --remotes"
alias graphmine='git log --oneline --graph origin/main HEAD $(git branch -a --format="%(refname:short)" | grep jfinlins)'
alias path-between="git rev-list --ancestry-path --topo-order --pretty=oneline"
alias commits-between="git rev-list --ancestry-path --topo-order --pretty"
function path-from-ancestor() {
  # Usage: path-from-ancestor COMMIT_1 COMMIT_2
  # Shows only the commits on the path from COMMIT_1 to the merge base of the pair
  # Optionally accepts one additional parameter that can be used to format the `git rev-list` results
  git merge-base $1 $2 | xargs -I ancestor git rev-list --ancestry-path --topo-order --pretty=oneline ancestor^..$1 $3
}

# GIT status visualization
alias status="git status ."
alias diff="git diff"
alias diffc="git diff --cached"
alias stat="git diff --stat"
alias statc="git diff --stat --cached"
function diffstat(){
  git show --stat $1 | egrep "[0-9]+ files"
}
alias swords="git show --word-diff-regex='\w+|[^[:space:]]'" # Show WORDS
alias sword="git show --word-diff-regex='\w+|[^[:space:]]'" # ^Show WORD
alias diffw="git diff --word-diff-regex='\w+|[^[:space:]]'" # Diff WORDS

# GIT stage management
alias amend="git commit --amend --no-edit"
alias amendnow="git commit --amend --no-edit -a"
alias commit="git commit"
alias commitnow="git commit --no-edit"

# GIT branch management
alias merge="git merge --no-ff --no-edit"
alias reset="git reset --hard"
alias undo="git reset --hard HEAD^"
function mergeinto() { local BRANCH=$(git branch --show-current); git checkout $1; git merge $BRANCH --no-ff --no-edit; }
function mergemain() { local BRANCH=$(git branch --show-current); git checkout main; git merge $BRANCH --no-ff --no-edit; git branch -d $BRANCH; }

function ub() {
  # Update branch: updates a branch to it's remote tracking version
  # Usage: ubranch BRANCH_NAME [REMOTE_NAME]
  local REMOTE="$2"
  [ -z "$REMOTE" ] && REMOTE="origin"

  echo "Remote: $REMOTE"
  git fetch "$REMOTE" "$1:$1"
}
function ucb() {
  # Update and Checkout Branch: Updates a branch to it's remote head and checks it out locally
  # Usage: ucb BRANCH_NAME [REMOTE_NAME]
  ub $1 $2 && git checkout $1
}

# Git blame related
function blame-dir() {
  git ls-files "$@" | while read file; do
    echo "$(git log -1 --format="%C(auto)%h %<(15,trunc)%ar %<(50,trunc)%s" -- "$file") $file";
  done
}

# Git Continuations
function git-continue() {
  # Source: https://stackoverflow.com/a/53370600/2844859
  local repo_path=$(git rev-parse --git-dir)
  local ret_status=$?

  if [ $ret_status -ne 0 ]; then
    exit $ret_status
  fi

  if [ -d "${repo_path}/rebase-merge" ]; then
    git rebase --continue
  elif [ -d "${repo_path}/rebase-apply" ]; then
    git rebase --continue
  elif [ -f "${repo_path}/MERGE_HEAD" ]; then
    git merge --continue
  elif [ -f "${repo_path}/CHERRY_PICK_HEAD" ]; then
    git cherry-pick --continue
  elif [ -f "${repo_path}/REVERT_HEAD" ]; then
    git revert --continue
  else
    echo "No something in progress?"
  fi
}
git config --global alias.continue 'git-continue'

# GIT remote management
alias fetch="git fetch"
alias prune="git fetch --prune"
alias push="git push"
alias pull="git fetch && git rebase origin/master"
alias graphu="git log --oneline --graph @ @{u}"
alias resetu="git reset --hard @{u}"
alias rebaseu="git rebase --autosquash @{u}"
alias diffu="git diff @{u}..@"
alias mergeu="git merge --no-ff --no-edit @{u}"

# Git refspec management
# Refspec helpers for bare-ish clones that start out tracking nothing but `main`.
#   git make-bare [REMOTE]            Reset REMOTE's fetch refspec so it only pulls `main`. Defaults to origin.
#   git track-bare [REMOTE]           Add a full `refs/heads/*` tracking refspec to REMOTE, then fetch it. Defaults to origin.
#   git track-prefix PREFIX [REMOTE]  Add fetch refspecs for branches and tags whose names start with PREFIX. REMOTE defaults to origin.
git config --global alias.make-bare '!f() { local REMOTE="${1:-origin}"; local BRANCH="${2:-$(git symbolic-ref --short HEAD)}"; git config --local remote.$REMOTE.fetch "+refs/heads/$BRANCH:refs/remotes/$REMOTE/$BRANCH"; }; f'
git config --global alias.track-bare '!f() { local REMOTE="${1:-origin}"; git config --local --add remote.$REMOTE.fetch "+refs/heads/*:refs/remotes/$REMOTE/*" && git fetch $REMOTE; }; f'
git config --global alias.track-prefix '!f() { local REMOTE="${2:-origin}"; git config --add remote.$REMOTE.fetch "+refs/heads/$1*:refs/remotes/$REMOTE/$1*"; git config --add remote.$REMOTE.fetch "+refs/tags/$1*:refs/tags/$1*"; }; f'

# Usage: `git pushu`. Behaves the same as `git push`, expect it also adds the current branch to the refspec for receiving updates.
git config --global alias.pushu '!f() { branch="${1:-$(git rev-parse --abbrev-ref HEAD)}"; git config --add remote.origin.fetch "+refs/heads/$branch:refs/remotes/origin/$branch"; git push -u origin "$branch" ${@:2}; }; f'

# This command deletes the local copy of all remote branches except "master" & "main"
alias prevmaster="git branch -r | egrep -v 'origin|master' | xargs git branch -Dr"
alias prevmain="git branch -r | egrep -v 'origin|main' | xargs git branch -Dr"

function is-ancestor() {
  # Helpful to determine if a particular commit is an ancestor of `beta` or `master` or other particular branches.
  # Usage: `is-ancestor INTERESTING_COMMIT OF_COMMIT`
  # https://stackoverflow.com/a/13526591/21454191
  git merge-base --is-ancestor -- $1 $2 && echo 'Yes' || echo 'No'
}


## Non-Git Aliases
function mktouch() {
  mkdir -p "$(dirname "$1")" && touch "$1"
}
alias hello="Echo 'World (v5)'"
