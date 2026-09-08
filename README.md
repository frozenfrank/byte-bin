# Git Index Demonstration Repo

This repository demonstrates that arbitrary data can be written into the `src/` folder of an
arbitrary git ref **without touching the working directory or the repo's real index**.

The motivating use case: an external tool (`epc`) downloads the current state of the files in a
server environment, then snapshots that state as a commit on a *server-tracking* ref such as
`refs/remotes/epc/env/861`. Each environment gets its own history of snapshots, and the developer's
checked-out worktree is never disturbed.

Everything is done with git plumbing commands (`hash-object`, `update-index`, `write-tree`,
`commit-tree`, `update-ref`) against a temporary `GIT_INDEX_FILE`, so the snapshots can be produced
entirely in the background.

## Quick start

Run the one-shot setup script:

```sh
./init.sh
```

```
Initializing special 'epc' remote...
Initializing server branches...
Generating sample commits on server branches...
Created 35 total commits across 9 branches.
View the commits with:  git log --oneline --graph --remotes=epc

Done.
```

This creates the `epc` remote, nine server branches under `refs/remotes/epc/env/*`, and a set of
realistic snapshot commits with differing histories on each branch. It is intentionally a one-time
operation: if the `epc` remote already exists, the script refuses to run and points you at the
individual scripts instead.

Then explore the result:

```sh
git log --oneline --graph --remotes=epc          # all server branch histories
git show epc/env/861                             # newest snapshot for Current Development Environment
git show epc/env/5325                            # newest snapshot for Stage 1 Primary
git show epc/env/40                              # newest snapshot for Final Packing
./inspect-branch-trees.sh epc/env/861            # commits alongside their trees
```

Perform interactive testing:

```sh
git checkout env/861   # Notice the shortcut works

# Generate server commits (as developer, and for server)
git commit
./commit-folder-to-ref-src-dir.sh x/1-alphabet refs/remotes/epc/env/861

# Check the status
git status             # Reports how many commits ahead/behind you are compared to the server
git log --oneline --graph @ @{u}

# Diff them!
git diff @{u}..        # Raw diff between the branches
git diff @{u}...       # Just what was committed by the developer
git diff ...@{u}       # Just what has changed on the server
git diff epc/env/5325 --stat  # Diff against stage 1
git diff epc/env/40 --stat    # Diff against final

# Reconcile them
git merge @{u}         # Merge the results
git rebase @{u}        # Alternatively, rebase instead

```

## The scripts

| Script | Purpose |
| --- | --- |
| `init.sh` | One-shot demo setup: builds the remote, the branches, and sample snapshot commits. |
| `init-remote.sh <remote>` | Registers a remote (e.g. `epc`) pointed at `file:///dev/null`. |
| `init-server-branch.sh <remote>/<branch> [<treeish>]` | Creates `refs/remotes/<remote>/<branch>` with a root commit. Defaults to the empty tree (`test-initial-tree`). |
| `commit-folder-to-ref-src-dir.sh <folder> <full-ref>` | **The core POC.** Commits the files of `<folder>` into `src/` on `<full-ref>`. |
| `commit-folder-to-all-remote-refs.sh <remote> <folder>` | Runs the above against every ref under `refs/remotes/<remote>`, in parallel. |
| `inspect-branch-trees.sh <git rev-list args>` | Pages through commits showing each commit's top-level tree. |

### The core script

```sh
./commit-folder-to-ref-src-dir.sh x/5-numbers-odd refs/remotes/epc/env/861
```

What it does:

1. Validates the folder and that the ref exists (`git show-ref --verify`).
2. Points `GIT_INDEX_FILE` at a temp file and loads the ref's existing tree into it (`git read-tree`).
3. Clears the existing `src/` entries, then hashes and stages each file from `<folder>` under `src/`.
4. Bails out with "No changes to commit." if the staged tree matches the ref (`git diff-index --cached`).
5. Writes the tree, creates a commit parented on the previous tip, and advances the ref with a
   compare-and-swap (`git update-ref <ref> <new> <old>`).

It is safe to run repeatedly against the same ref; each run appends one snapshot commit.

### Why `file:///dev/null`?

`init-remote.sh` registers the remote with a deliberately unusable URL. The server-tracking
branches are meant to be *published* by the external tool, not `git push`ed by a developer. Pointing
the remote at `/dev/null` makes accidental pushes fail loudly. Developers remain free to push the
commits to a real remote; setting `remote.pushDefault` avoids selecting `epc` by default.

## Sample data

* `x/1-alphabet`, `x/2-numbers`, `x/4-numbers-even`, `x/5-numbers-odd` — small synthetic file sets
  useful for producing obvious diffs.
* `x/3n-src/1` … `x/3n-src/5` — successive revisions of a realistic `.epc` source snapshot.
* `src/` — a checked-in example of the routines an environment snapshot contains.
* `workspace.json` — an example of the metadata an `epc` workspace would carry (environment id,
  DLG, and the objects belonging to it). Ref-to-environment mapping could live here, in
  `.git/config`, or be encoded in the ref name itself.

## References

* The Git Book
  * https://git-scm.com/book/en/v2/Git-Internals-Git-Objects
  * https://git-scm.com/book/en/v2/Git-Internals-Git-References
  * https://git-scm.com/book/en/v2/Git-Branching-Remote-Branches
* Git Plumbing - Read refs
  * https://git-scm.com/docs/git-rev-parse
  * https://git-scm.com/docs/git-cat-file
  * https://git-scm.com/docs/git-show-ref
  * https://git-scm.com/docs/git-ls-files
* Git Plumbing - Write refs
  * https://git-scm.com/docs/git-hash-object
  * https://git-scm.com/docs/git-read-tree
  * https://git-scm.com/docs/git-update-index
  * https://git-scm.com/docs/git-diff-index
  * https://git-scm.com/docs/git-write-tree
  * https://git-scm.com/docs/git-commit-tree
  * https://git-scm.com/docs/git-update-ref
* Git Porcelain
  * https://git-scm.com/docs/git-config
  * https://git-scm.com/docs/git-remote
  * https://git-scm.com/docs/git-status
  * https://git-scm.com/docs/git-show
  * https://git-scm.com/docs/git-commit
  * https://git-scm.com/docs/git-log
  * https://git-scm.com/docs/git-shortlog
