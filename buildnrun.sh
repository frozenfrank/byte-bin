#!/bin/bash
rm -rf bld
#module load gcc/latest cmake catch2 nvhpc
mkdir bld
cd bld
echo "Building"
cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo ..
cmake --build . --parallel
echo "Done building"