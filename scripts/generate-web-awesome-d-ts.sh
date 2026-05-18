#! /bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

base_dir=$(pwd)
tmp_file=$(mktemp)
component_dir="node_modules/@web.awesome.me/webawesome-pro/dist/components"
target_file="src/model/web-awesome.d.ts"
output_file="$base_dir/$target_file"
folders_searched=0

# Reset the file to blank
echo -n '' > $output_file

# Add initial LitElement import
echo 'import type { LitElement } from "lit-element/lit-element.js";' >> $output_file
echo '' >> $output_file

# Process all components in the library
cd $component_dir
for file in *; do
  component=$(grep "export default class" $file/$file.d.ts | awk '{print $4}')
  echo "import type R$component from '@web.awesome.me/webawesome-pro/dist/components/$file/$file.js';" >> $output_file
  echo "export type $component = R$component & LitElement;" >> $tmp_file
  ((++folders_searched))
done;
echo '' >> $output_file

# Output the exports at the end
cat $tmp_file >> $output_file
rm $tmp_file

# Done
echo "Output $folders_searched components to $target_file"
