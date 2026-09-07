#!/bin/bash
{

BRANCH="$1"
git rev-list -z $BRANCH | while read -r SHA; do
    #echo -en "\nCommit: $SHA\n";
    echo -en "\n\n" && git show $SHA -s --color=always
    git cat-file -p $SHA^{tree};
done
} | less -R
