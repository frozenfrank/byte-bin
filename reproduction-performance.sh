# Usage: ./reproduction-performance.sh

### REPRO #1 ###
echo "Reproduction #1 (current)..."

source reproduction-launch.sh > /dev/null

time ./init.sh
time ./init.sh --re-init
time ./init.sh --re-init
time ./init.sh --re-init

source reproduction-exit.sh


### REPRO #2 ###
echo "Reproduction #2 (baseline)..."

source reproduction-launch.sh > /dev/null
git checkout fec583a  # pre-performance-optimization

time ./init.sh
time ./init.sh --re-init
time ./init.sh --re-init
time ./init.sh --re-init

source reproduction-exit.sh
