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

awk 'BEGIN {print "storage npernode wall_secs sys_secs usr_secs"} /^RES: / {sub(/^RES: /, ""); print}' results.log > data.csv
```

```shell
## Manually clean results
cp results.log results_cleaned.log
echo "TODO: Manually remove early termination results, etc..."
awk 'BEGIN {print "storage npernode wall_secs sys_secs usr_secs"} /^RES: / {sub(/^RES: /, ""); print}' results_cleaned.log > data_cleaned.csv
```

## Results

The following files contain the research results. CSV files are delimited with a space character.

| File | Description |
| ---- | :---------- |
| [`results.log`](./results.log) | Raw evaluation output from processes |
| [`data.csv`](./data.csv) | Extracted run times from `results.log` |
| [`results_cleaned.log`](./results_cleaned.log) | Raw evaluation output, manually cleaned to error times |
| [`data_cleaned.csv`](./data_cleaned.csv) | Extracted run times from `results_cleaned.log` |
