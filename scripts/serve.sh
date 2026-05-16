#! /bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/build.sh
./node_modules/http-server/bin/http-server dist/ -c-1
