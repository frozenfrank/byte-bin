# Phase 7 Performance Testing

## Process

### Setup

```shell
## Context
pwd
# /home/finljam/student-repos/Despain-fall-2024/build
git show
# commit 5b4a8e3992994ca6e98402333fbccdce0fffe493 (HEAD -> updated-phase7)
# Author: James Finlinson <finljam@byu.edu>
# Date:   Wed Feb 19 12:19:19 2025 -0700
#
#     Exclude build directors from git going forward
# commit 9ce2d35bd293d74a89ac747c0572f71ae86d5524 (tag: phase7, origin/updated-phase7)
# Author: Paige Despain <paigeid@byu.edu>
# Date:   Wed Dec 4 12:58:55 2024 -0700
#
#     should work
```

```shell
## Prepare environment
salloc -p m9 -t 60 --mem 70G -N 2 --ntasks-per-node 28
# module load cmake gcc/14.1 openmpi/5.0
module load cmake gcc/14.1 openmpi/5.0 mpl grade-scicomp
```

```shell
## Prepare files
echo $MEDIUM_IN
# /grphome/fslg_course/grading/wavefiles/2D/2d-medium-in.wo

SHM_BASE="/dev/shm"
TMP_BASE="/tmp"
AUTODELETE_BASE="/nobackup/autodelete/usr/$USER"
ARCHIVE_BASE="/nobackup/archive/usr/$USER"

medium_in_file_name=`basename $MEDIUM_IN`
export MEDIUM_STD_IN="$MEDIUM_IN"
export MEDIUM_SHM_IN="$SHM_BASE/$medium_in_file_name"
export MEDIUM_TMP_IN="$TMP_BASE/$medium_in_file_name"
export MEDIUM_AUTODELETE_IN="$AUTODELETE_BASE/$medium_in_file_name"
export MEDIUM_ARCHIVE_IN="$ARCHIVE_BASE/$medium_in_file_name"

cp $MEDIUM_IN $MEDIUM_SHM_IN
cp $MEDIUM_IN $MEDIUM_TMP_IN
cp $MEDIUM_IN $MEDIUM_AUTODELETE_IN
cp $MEDIUM_IN $MEDIUM_ARCHIVE_IN

medium_out_file_name="medium.out"
export MEDIUM_STD_OUT="$medium_out_file_name"
export MEDIUM_SHM_OUT="$SHM_BASE/$medium_out_file_name"
export MEDIUM_TMP_OUT="$TMP_BASE/$medium_out_file_name"
export MEDIUM_AUTODELETE_OUT="$AUTODELETE_BASE/$medium_out_file_name"
export MEDIUM_ARCHIVE_OUT="$ARCHIVE_BASE/$medium_out_file_name"
```

```shell
## Compile source
mkdir build && cd build
cmake ..
make -j
```

### Evaluation

```shell
## Solve waves
N_PER_NODE=4
# /bin/time -f "%e %S %U" mpirun --npernode $N_PER_NODE ./wavesolve_mpi $MEDIUM_STD_IN $MEDIUM_STD_OUT

# Evaluates the project using a known storage code
# Storage codes: STD SHM, TMP, AUTODELETE, ARCHIVE
# Usage: evaluate STD
evaluate() {
  local npernode=${N_PER_NODE:-4}

  local storage_code=$1
  if [ -z "$storage_code" ]; then
    echo "Error: No storage specified. Usage: evaluate <STORAGE_CODE>" >&2
    return 1
  fi

  local in_var="MEDIUM_${storage_code}_IN"
  local out_var="MEDIUM_${storage_code}_OUT"

  echo /bin/time -f "RES: $storage_code ($npernode) %e %S %U" mpirun --npernode "$npernode" ./wavesolve_mpi "${!in_var}" "${!out_var}"
  /bin/time -f "RES: $storage_code ($npernode) %e %S %U" mpirun --npernode "$npernode" ./wavesolve_mpi "${!in_var}" "${!out_var}"
}
```

```shell
## Repeatedly evaluate tests
N_PER_NODE=4
N_PER_NODE=8
N_PER_NODE=16

for i in {1..8}; do
  echo "Starting iteration $i" `date`;
  evaluate STD >> results.log 2>&1;
  evaluate AUTODELETE >> results.log 2>&1;
  evaluate ARCHIVE >> results.log 2>&1;
done;

for i in {1..8}; do
  echo "Starting iteration $i" `date`;
  evaluate STD 2>> results.log > /dev/null
  evaluate AUTODELETE 2>> results.log > /dev/null
  evaluate ARCHIVE 2>> results.log > /dev/null
done;
```

### Data Extraction

```shell
## Extract results
mv results.log ..
cd ..

awk '/^RES: / {sub(/^RES: /, ""); print}' results.log > data.log
```

```shell
## Manually clean results
cp results.log results_cleaned.log
echo "TODO: Manually remove early termination results, etc..."
awk '/^RES: / {sub(/^RES: /, ""); print}' results_cleaned.log > data_cleaned.log
```

## Results

```csv
storage npernode wall_secs sys_secs usr_secs
STD (4) 16.67 1.53 47.19
STD (4) 11.76 1.47 32.12
STD (4) 17.06 1.59 47.39
STD (4) 16.88 1.44 46.67
STD (4) 16.94 1.61 52.49
STD (4) 24.83 1.44 70.78
STD (4) 16.63 1.46 51.23
STD (4) 24.78 1.36 86.83
STD (4) 26.61 1.50 82.21
STD (4) 25.60 1.56 65.39
AUTODELETE (4) 17.50 1.54 49.06
AUTODELETE (4) 17.86 1.31 48.03
AUTODELETE (4) 16.79 1.40 48.78
AUTODELETE (4) 16.81 1.42 54.42
AUTODELETE (4) 16.80 1.58 45.71
AUTODELETE (4) 18.03 1.41 49.02
ARCHIVE (4) 10.33 1.48 31.87
ARCHIVE (4) 10.82 1.42 31.08
ARCHIVE (4) 10.49 1.46 30.55
ARCHIVE (4) 10.72 1.47 30.52
ARCHIVE (4) 10.71 1.50 30.28
ARCHIVE (4) 10.74 1.55 30.60
```
