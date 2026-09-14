# Usage: ./reproduction-performance.sh

### REPRO #1 ###
echo "Reproduction #1 (current)..."

source reproduction-launch.sh > /dev/null 2>&1
git show -s --no-decorate

{
  time ./init.sh
  time ./init.sh --re-init
  time ./init.sh --re-init
  time ./init.sh --re-init
} > /dev/null

git show main:reproduction-exit.sh | source /dev/stdin


### REPRO #2 ###
echo ""
echo ""
echo "Reproduction #2 (baseline)..."

source reproduction-launch.sh > /dev/null 2>&1
git checkout fec583a --quiet # pre-performance-optimization
git show -s --no-decorate

{
  time ./init.sh
  time ./init.sh --re-init
  time ./init.sh --re-init
  time ./init.sh --re-init
} > /dev/null

git show main:reproduction-exit.sh | source /dev/stdin
