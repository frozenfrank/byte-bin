# Git Index Demonstration Repo

This repository demonstrates the ability to write arbitrary data into the src/ folder of an arbitrary git ref.

First create a ref to test with. It is recommended-- but not required-- to use a pseudo-remote tracking ref like `refs/remotes/<remote_name>/<branch_name>`.

Then, execute the POC script passing it an arbitrary folder contains files, and an arbitrary fully-qualified ref.

```sh
x/1-alphabet
x/2-numbers
x/3-src
x/4-numbers-even
x/5-numbers-odd
./commit-folder-to-ref-src-dir.sh x/5-numbers-odd refs/remotes/test/first 
./commit-folder-to-ref-src-dir.sh x/5-numbers-odd refs/remotes/test/first 
./commit-folder-to-ref-src-dir.sh x/5-numbers-odd refs/remotes/test/first 
./commit-folder-to-ref-src-dir.sh x/5-numbers-odd refs/remotes/test/first 
./commit-folder-to-ref-src-dir.sh x/5-numbers-odd refs/remotes/test/first 
```

## References

* The Git Book
  * https://git-scm.com/book/en/v2/Git-Internals-Git-Objects
  * https://git-scm.com/book/en/v2/Git-Internals-Git-References
  * https://git-scm.com/book/en/v2/Git-Branching-Remote-Branches
* Git Plumbing - Read refs
  * https://git-scm.com/docs/git-rev-parse
  * https://git-scm.com/docs/git-show-ref
  * https://git-scm.com/docs/git-ls-files
* Git Plumbing - Write refs
  * https://git-scm.com/docs/git-hash-object
  * https://git-scm.com/docs/git-read-tree
  * https://git-scm.com/docs/git-update-index
  * https://git-scm.com/docs/git-write-tree
  * https://git-scm.com/docs/git-commit-tree
  * https://git-scm.com/docs/git-update-ref

