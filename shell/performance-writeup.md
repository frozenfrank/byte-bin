
# Performance Testing

## Detailed Stats — Root Directory

The command:
```shell
cd ~/Documents
/usr/bin/time -lp ~/Documents/Personal/byte-bin/shell/sizeof_node_modules.sh > /dev/null
```

### Original Edition

```
real 34.18
user 0.92
sys 13.49
             3145728  maximum resident set size
                   0  average shared memory size
                   0  average unshared data size
                   0  average unshared stack size
                5104  page reclaims
                  75  page faults
                   0  swaps
                   0  block input operations
                   0  block output operations
                   0  messages sent
                   0  messages received
                   5  signals received
              109160  voluntary context switches
               54699  involuntary context switches
            25517294  instructions retired
            20511231  cycles elapsed
             1491712  peak memory footprint
```


### Latest Performance Optimized (bash)

```
real 12.65
user 0.18
sys 4.09
             3276800  maximum resident set size
                   0  average shared memory size
                   0  average unshared data size
                   0  average unshared stack size
                1210  page reclaims
                  25  page faults
                   0  swaps
                   0  block input operations
                   0  block output operations
                   0  messages sent
                   0  messages received
                   0  signals received
               68323  voluntary context switches
                 633  involuntary context switches
            10843535  instructions retired
             6067801  cycles elapsed
             1016512  peak memory footprint
```

### Latest Performance Optimized (zsh)

```
real 13.03
user 0.18
sys 4.18
             2850816  maximum resident set size
                   0  average shared memory size
                   0  average unshared data size
                   0  average unshared stack size
                1418  page reclaims
                  20  page faults
                   0  swaps
                   0  block input operations
                   0  block output operations
                   0  messages sent
                   0  messages received
                   3  signals received
               68336  voluntary context switches
                1559  involuntary context switches
            22563567  instructions retired
            16826761  cycles elapsed
             1377024  peak memory footprint
```

## Detailed Stats — Simple Directory

The command:
```shell
cd ~/Documents/Personal/byte-bin/shell
/usr/bin/time -lp sizeof_node_modules.sh > /dev/null
```

### Latest Edition
```
real 0.00
user 0.00
sys 0.00
             2146304  maximum resident set size
                   0  average shared memory size
                   0  average unshared data size
                   0  average unshared stack size
                 958  page reclaims
                  17  page faults
                   0  swaps
                   0  block input operations
                   0  block output operations
                   0  messages sent
                   0  messages received
                   3  signals received
                  24  voluntary context switches
                  44  involuntary context switches
            22624389  instructions retired
            11315148  cycles elapsed
             1426176  peak memory footprint
```

## Individual Steps

The command:
```shell
cd ~/Documents
/usr/bin/time -p ~/Documents/Personal/byte-bin/shell/sizeof_node_modules.sh > /dev/null
```

### Original Edition

```
       12.43 real         0.26 user         5.55 sys  # find **/node_modules -type d
       21.25 real         0.08 user         0.00 sys  # grep -E "node_modules$"
       21.25 real         0.00 user         0.00 sys  # grep -vE "node_modules/"
       21.28 real         0.00 user         0.02 sys  # xargs -I {} echo '"{}"'
       31.73 real         0.15 user         3.51 sys  # xargs du -hs
       31.73 real         0.00 user         0.00 sys  # sort -hr

# Overall shell command
real 31.74
user 0.91
sys 13.13
```

### Optimized Edition

```
        2.21 real         0.02 user         0.61 sys  # find $DIR -type d -name "node_modules" -prune -print0
       12.63 real         0.15 user         3.50 sys  # xargs -0 du -hs
       12.64 real         0.00 user         0.00 sys  # sort -hrS 4K

# Overall shell command
real 12.93
user 0.18
sys 4.12
```
