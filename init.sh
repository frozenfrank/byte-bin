#!/bin/bash

# Allow re-initialization
case " $@ " in
  *" --re-init "*)
    echo "Re-initializing..."
    git remote remove epc
    ;;
esac

# Verify not already configured
if git config --get remote.epc.url >/dev/null ; then
    echo "This initialization script can only be run once."
    echo "Invoke the other scripts individually to play around."
    echo ""
    echo "Available scripts:"
    ls -1 *.sh | grep -v init
    exit 1
fi

# Verify the tag has been pulled
git show-ref --verify test-initial-tree || exit 1

# Init the special EPC remote
echo "Initializing special 'epc' remote..."
./init-remote.sh epc > /dev/null

# Init several server-tracking branches
echo "Initializing server branches..."
{
    ./init-server-branch.sh epc/env/861 &
    ./init-server-branch.sh epc/env/5325 &
    ./init-server-branch.sh epc/env/40 &
    ./init-server-branch.sh epc/env/Presto1492 &
    ./init-server-branch.sh epc/env/Presto0008 &
    ./init-server-branch.sh epc/env/Presto1979 &
    ./init-server-branch.sh epc/env/CdeDyn &
    ./init-server-branch.sh epc/env/Stage1Dyn &
    ./init-server-branch.sh epc/env/NorthMetro &

    wait
} > /dev/null

echo "Generating sample commits on server branches..."
{
    # Generate sample data on the branches
    ./commit-folder-to-all-remote-refs.sh epc/env x/3n-src/1

    # Construct realistic diffs on different environments
    (
        ./commit-folder-to-ref-src-dir.sh x/3n-src/1 refs/remotes/epc/env/861
        ./commit-folder-to-ref-src-dir.sh x/3n-src/2 refs/remotes/epc/env/861
        ./commit-folder-to-ref-src-dir.sh x/3n-src/3 refs/remotes/epc/env/861
        ./commit-folder-to-ref-src-dir.sh x/3n-src/4 refs/remotes/epc/env/861
        ./commit-folder-to-ref-src-dir.sh x/3n-src/5 refs/remotes/epc/env/861
    ) &

    ./commit-folder-to-ref-src-dir.sh x/3n-src/3 refs/remotes/epc/env/5325 &
    ./commit-folder-to-ref-src-dir.sh x/3n-src/2 refs/remotes/epc/env/40 &

    (
        ./commit-folder-to-ref-src-dir.sh x/3n-src/3 refs/remotes/epc/env/CdeDyn
        ./commit-folder-to-ref-src-dir.sh x/3n-src/5 refs/remotes/epc/env/CdeDyn
    ) &

    (
        ./commit-folder-to-ref-src-dir.sh x/1-alphabet refs/remotes/epc/env/Presto0008
        ./commit-folder-to-ref-src-dir.sh x/2-numbers refs/remotes/epc/env/Presto0008
        ./commit-folder-to-ref-src-dir.sh x/1-alphabet refs/remotes/epc/env/Presto0008
    ) &

    (
        ./commit-folder-to-ref-src-dir.sh x/2-numbers refs/remotes/epc/env/Presto1492
        ./commit-folder-to-ref-src-dir.sh x/4-numbers-even refs/remotes/epc/env/Presto1492
        ./commit-folder-to-ref-src-dir.sh x/5-numbers-odd refs/remotes/epc/env/Presto1492
        ./commit-folder-to-ref-src-dir.sh x/4-numbers-even refs/remotes/epc/env/Presto1492
        ./commit-folder-to-ref-src-dir.sh x/5-numbers-odd refs/remotes/epc/env/Presto1492
        ./commit-folder-to-ref-src-dir.sh x/2-numbers refs/remotes/epc/env/Presto1492
    ) &

    wait
} > /dev/null
COMMITS_CREATED=$(git shortlog -s --remotes=epc | cut -f1 | awk '{$1=$1};1')
BRANCHES_CREATED=$(git for-each-ref --format="%(refname)" refs/remotes/epc | wc -l | awk '{$1=$1};1')
echo "Created $COMMITS_CREATED total commits across $BRANCHES_CREATED branches."
echo "View the commits with:  git log --oneline --graph --remotes=epc"
echo ""

echo "Done."
