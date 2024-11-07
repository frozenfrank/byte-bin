#!/bin/zsh

# This script will create an initialize a typescript project
FOLDER=$1

if [ -z "$FOLDER" ]; then
  echo "Usage: $0 <target_directory>"
  exit 1
fi

# Create folder
echo "Creating folder '$FOLDER'"
mkdir $FOLDER
cd $FOLDER

# Actually init the project
echo "Creating project"
npm init -y
npm install typescript --save-dev
npm install @types/node --save
npm install ts-node --save-dev
mkdir src
cat > src/index.ts << EOF
console.log("Hello, world!");
EOF

# Add in the npm start script
ed package.json << EOF
6i
    "start": "npx ts-node src/index.ts",
.
w
EOF

# Add in VScode launch script
mkdir .vscode
cat > .vscode/launch.json << EOF
{
  // Use IntelliSense to learn about possible attributes.
  // Hover to view descriptions of existing attributes.
  // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug <Name of Program>",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["\${workspaceFolder}/src/index.ts"],
      "sourceMaps": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": [
        "<node_internals>/**"
      ],
      "program": "\${workspaceFolder}/src/index.ts",
      "outFiles": [
        "\${workspaceFolder}/**/*.js"
      ]
    }
  ]
}
EOF


# Optional. Initialize typechecking
echo "Initializing typescript"
npx tsc --init
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    /* Visit https://aka.ms/tsconfig to read more about this file */
    "target": "ESNext",
    "module": "commonjs",
    "sourceMap": true,
    "outDir": "dist",
  }
}
EOF

# Optional. Git init
echo "Initializing git"
git init
echo "node_modules/" >> .gitignore
git add .
git commit -m "Init new project"

# Optional. Open the folder in VScode
echo "Opening in a new VScode terminal"
code .

echo "Done"
