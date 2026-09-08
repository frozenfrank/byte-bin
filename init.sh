#!/bin/bash

if [ -d ".git/refs/remotes/epc" ]; then
    echo "This initialization script can only be run once."
    echo "Invoke the other init*.sh scripts individually to play around."
    exit 1
fi

# Init the special EPC remote
./init-remote.sh epc

# Init several server-tracking branches
./init-server-branch.sh epc/env/861
./init-server-branch.sh epc/env/5325
./init-server-branch.sh epc/env/Presto1492
./init-server-branch.sh epc/env/CdeDyn
./init-server-branch.sh epc/env/Stage1Dyn

# Generate sample data on the branches
