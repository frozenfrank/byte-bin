# Mandelbrot Evaluations

Findings from completing the homework.

## Commands Used

```shell
# make the binaries
make

# Evaluate sequential execution
make sequential

# Convert image for viewing
make png

# Evaluate parallel execution
make parallel [THREADS=8]

# Cleanup
make clan
```

Correct answer SHA1SUM:
```txt
04c0e2cf0a9e2cbc58c4d16348ef4e3be2c46efc
```

## Evaluations

Pastings of the runtime results from various runs of the program.

### Serial program (fully sequential):

time ./mandelbrot 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm

real	0m33.182s
user	0m28.414s
sys	0m0.289s

### Parallel program (1 thread)

OMP_NUM_THREADS=1 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 28.808434
30.05user 0.27system 0:33.70elapsed 89%CPU (0avgtext+0avgdata 298956maxresident)k
0inputs+891272outputs (0major+74361minor)pagefaults 0swaps

### 2 threads

OMP_NUM_THREADS=2 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 14.608910
29.27user 0.30system 0:20.64elapsed 143%CPU (0avgtext+0avgdata 298936maxresident)k
0inputs+891272outputs (0major+74363minor)pagefaults 0swaps

### Parallel program (8 threads)

OMP_NUM_THREADS=8 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 4.519520
31.92user 0.32system 0:10.52elapsed 306%CPU (0avgtext+0avgdata 297896maxresident)k
0inputs+891272outputs (0major+74377minor)pagefaults 0swaps

### Parallel program (4 threads)
OMP_NUM_THREADS=4 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 8.495725
30.66user 0.29system 0:14.55elapsed 212%CPU (0avgtext+0avgdata 298680maxresident)k
0inputs+891272outputs (0major+74367minor)pagefaults 0swaps

### 16 threads

OMP_NUM_THREADS=16 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 2.982503
37.92user 0.29system 0:08.96elapsed 426%CPU (0avgtext+0avgdata 297616maxresident)k
0inputs+891272outputs (0major+74388minor)pagefaults 0swaps

