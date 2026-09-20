#!/bin/bash
# Usage: $0 <arguments to git log>
# Example: $0 --remotes=epc
# Example: $0 origin/main -3

{
git rev-list -z "$@" | while read -r SHA; do
    #echo -en "\nCommit: $SHA\n";
    echo -en "\n\n" && git show $SHA -s --color=always
    git cat-file -p $SHA^{tree};
done
} | less -R
