# Mandelbrot Fractal Evaluations

Findings from completing the homework.

Final product sample image:

![Downsized Mandelbrot Fractal Image](./sample_mandelbrot_medium.jpeg)

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

### Serial program

```txt
time ./mandelbrot 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm

real	0m33.182s
user	0m28.414s
sys	0m0.289s
```

### Parallel program

Overall results are summaried in the following table, and detailed log output is available below.

#### Results Summary

![Mandelbrot Execution Time by Thread Configuration](./results_summary_chart.png)

| Num <br>Threads | User<br>time | System<br>time | **Real<br> time** | CPU<br>Usage | Parallel<br>section |
| :- | :---: | :--: | :-----: | :--: | :-------- |
| 1  | 30.05 | 0.27 | 0:33.70 | 89%  | 28.808434 |
| 2  | 29.27 | 0.30 | 0:20.64 | 143% | 14.608910 |
| 4  | 30.66 | 0.29 | 0:14.55 | 212% |  8.495725 |
| 8  | 31.92 | 0.32 | 0:10.52 | 306% |  4.519520 |
| 16 | 37.92 | 0.29 | 0:08.96 | 426% |  2.982503 |
| 32 | 42.21 | 0.27 | 0:06.56 | 647% |  2.399604 |
| 64 | 42.62 | 0.29 | 0:06.41 | 669% |  2.225711 |

#### Execution Logs

```shell
#### 1 thread

OMP_NUM_THREADS=1 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 28.808434
30.05user 0.27system 0:33.70elapsed 89%CPU (0avgtext+0avgdata 298956maxresident)k
0inputs+891272outputs (0major+74361minor)pagefaults 0swaps

#### 2 threads

OMP_NUM_THREADS=2 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 14.608910
29.27user 0.30system 0:20.64elapsed 143%CPU (0avgtext+0avgdata 298936maxresident)k
0inputs+891272outputs (0major+74363minor)pagefaults 0swaps

#### 4 threads

OMP_NUM_THREADS=4 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 8.495725
30.66user 0.29system 0:14.55elapsed 212%CPU (0avgtext+0avgdata 298680maxresident)k
0inputs+891272outputs (0major+74367minor)pagefaults 0swaps

#### 8 threads

OMP_NUM_THREADS=8 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 4.519520
31.92user 0.32system 0:10.52elapsed 306%CPU (0avgtext+0avgdata 297896maxresident)k
0inputs+891272outputs (0major+74377minor)pagefaults 0swaps

#### 16 threads

OMP_NUM_THREADS=16 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 2.982503
37.92user 0.29system 0:08.96elapsed 426%CPU (0avgtext+0avgdata 297616maxresident)k
0inputs+891272outputs (0major+74388minor)pagefaults 0swaps

#### 32 threads

OMP_NUM_THREADS=32 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 2.399604
42.21user 0.27system 0:06.56elapsed 647%CPU (0avgtext+0avgdata 297704maxresident)k
136inputs+891272outputs (3major+74425minor)pagefaults 0swaps

#### 64 threads

OMP_NUM_THREADS=64 time ./mandelbrot-par 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
TIME: 2.225711
42.62user 0.29system 0:06.41elapsed 669%CPU (0avgtext+0avgdata 289388maxresident)k
56inputs+891272outputs (1major+74493minor)pagefaults 0swaps
```

## Speedup Analysis

Amdahl's Law of Speedup Performance:

$$T_{k}=\frac{pT}{k}+\left(1-p\right)T$$

Where:
* $T$ is the total sequential time
* $p$ is the fraction of total that can be sped up ($0\le p\le 1$)
* $k$ is the speedup factor

Homework provided equation:

$$T_{\alpha}=\frac{pT}{\alpha}+\left(1-p\right)T$$

> [!NOTE]
> How did we make the leap from discussing $k$ in terms of speedup factor to discussing $\alpha$ which represents a particular instance?

Where
* $\alpha$ is the speedup of the parallel region only
  * Substituted with $S_{4}\approx3.4$
* $p$ is the fraction of original run time that is parallelizable
  * Our unknown variable
* $T_{\alpha}$ is the runtime for threads=4
  * Substituted with $T_{4}\approx14.55$
* $T$ is the total runtime with threads=1
  * Substituted with $T_{1}\approx33.70$

Algebraically solved for $p$:

$$p=\frac{\frac{T_{a}a}{T}-a}{1-a}\approx80.5\%$$

Interpretation:
Approximately **80.5%** of the Mandelbrot equation is currently parallelizable. The wall time for this portion could be divided by leveraging additional compute cores. The remaining 19.5% of the computational work remains sequential and cannot be sped up by leveraging additional compute resources.
