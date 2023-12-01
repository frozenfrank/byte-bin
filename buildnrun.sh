#!/bin/bash
rm -rf bld
module purge
module load gcc/latest cmake catch2 nvhpc
mkdir bld
cd bld
echo "Building"
cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo ..
cmake --build . --parallel
echo "Done building"
sleep 1

# echo ""
# echo "testing tiny"
# ./bld/wavesolve_gpu ../../wavefiles/2d-tiny-in.wo out.wo
# ./../../wavefiles/wavediff out.wo ../../wavefiles/2d-tiny-out.wo 

# echo ""
# echo "testing small"
# ./bld/wavesolve_gpu ../../wavefiles/2d-small-in.wo out.wo
# ./../../wavefiles/wavediff out.wo ../../wavefiles/2d-small-out.wo 

# echo ""
# echo "testing medium"
# time ./bld/wavesolve_gpu ../../wavefiles/2d-medium-in.wo out.wo
# ./../../wavefiles/wavediff out.wo ../../wavefiles/2d-medium-out.wo 