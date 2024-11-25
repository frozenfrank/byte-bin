# Mandelbrot Evaluations

Findings from completing the homework.

## Commands Used

```shell
# make the binary
make

# Evaluate sequential execution
time ./mandelbrot 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
sha1sum pic.ppm

# Convert image for viewing
MAGICK_CONFIGURE_PATH=. convert -negate -normalize -fill blue -tint 100 pic.ppm pic.png
```

Correct answer SHA1SUM:
```txt
04c0e2cf0a9e2cbc58c4d16348ef4e3be2c46efc
```

## Evaluations

Serial program (fully sequential):
time ./mandelbrot 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm

real	0m33.182s
user	0m28.414s
sys	0m0.289s

Parallel program
OMP_NUM_THREADS=8 time ./mandelbrot 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
29.30user 0.25system 0:33.99elapsed 86%CPU (0avgtext+0avgdata 298500maxresident)k
0inputs+891272outputs (0major+74344minor)pagefaults 0swaps
