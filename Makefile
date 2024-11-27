CC = gcc
CFLAGS =
# CFLAGS = -Wall -O2 -g -I ../include/

COORDS ?= 0.27085 0.27100 0.004640 0.004810
SIZE ?= 1000 8192

THREADS ?= 16

.PHONY: all
all: mandelbrot-parallel

mandelbrot-sequential: mandelbrot.c
	$(CC) $(CFLAGS) -o mandelbrot-seq mandelbrot.c

mandelbrot-parallel: mandelbrot.c
	$(CC) $(CFLAGS) -o mandelbrot-par mandelbrot.c -fopenmp

.PHONY: sequential
sequential:
	time ./mandelbrot-seq $(COORDS) $(SIZE) pic.ppm
	sha1sum pic.ppm
	cp pic.ppm pic-seq.ppm

.PHONY: parallel
parallel:
	OMP_NUM_THREADS=$(THREADS) time ./mandelbrot-par $(COORDS) $(SIZE) pic.ppm
	sha1sum pic.ppm
	cp pic.ppm pic-par.ppm

.PHONY: draw
draw:
	OMP_NUM_THREADS=$(THREADS) ./mandelbrot-par $(COORDS) $(SIZE) pic.ppm

png: pic.ppm
	MAGICK_CONFIGURE_PATH=. convert -negate -normalize -fill blue -tint 100 pic.ppm pic.png

.PHONY: clean
clean:
	rm -f mandelbrot-* pic*.ppm pic.png
