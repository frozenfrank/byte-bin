# GIT history visualizations
alias log="git log --oneline"
alias graph="git log --oneline --graph"
alias graphall="git log --oneline --graph --all"
alias graphmain="git log --oneline --graph --first-parent"
alias graphhead="git log --oneline --graph --first-parent head main"
alias graphimp="git log --oneline --graph --first-parent --branches --remotes"
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

# GIT stage management
alias add="git add"
alias amend="git commit --amend --no-edit"
alias amendnow="git commit --amend --no-edit -a"
alias commit="git commit"

# GIT branch management
alias merge="git merge --no-ff"
alias reset="git reset --hard"
alias undo="git reset --hard HEAD^"
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

# GIT remote management
alias fetch="git fetch"
alias prune="git fetch --prune"
alias push="git push"
alias pull="git fetch && git rebase origin/master"

# This command deletes the local copy of all remote branches except "master" & "main"
alias prevmaster="git branch -r | egrep -v 'origin|master' | xargs git branch -Dr"
alias prevmain="git branch -r | egrep -v 'origin|main' | xargs git branch -Dr"

function is-ancestor() {
  # Helpful to determine if a particular commit is an ancestor of `beta` or `master` or other particular branches.
  # Usage: `is-ancestor INTERESTING_COMMIT OF_COMMIT`
  # https://stackoverflow.com/a/13526591/21454191
  git merge-base --is-ancestor -- $1 $2 && echo 'Yes' || echo 'No'
}


## Other Aliases
BYTE_BIN="/path/to/root-of/byte-bin"
alias bb="cd $BYTE_BIN" # Byte Bin
export PATH="$BYTE_BIN/shell:$PATH"
