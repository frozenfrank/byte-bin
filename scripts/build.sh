#! /bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf dist/
./node_modules/.bin/esbuild src/index.ts --bundle --minify --outfile=dist/bundle.js
cp src/fragment.html dist/
cp src/styles.css dist/
awk '{ print } /Insert Content Here/ { system("cat src/fragment.html") }' src/index.html > dist/index.html
