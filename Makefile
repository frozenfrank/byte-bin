CC = gcc
CFLAGS =
# CFLAGS = -Wall -O2 -g -I ../include/

THREADS ?= 1

.PHONY: all
all: mandelbrot-parallel

mandelbrot-sequential: mandelbrot.c
	$(CC) $(CFLAGS) -o  mandelbrot mandelbrot.c

mandelbrot-parallel: mandelbrot.c
	$(CC) $(CFLAGS) -o mandelbrot mandelbrot.c -fopenmp

sequential:
	time ./mandelbrot 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
	sha1sum pic.ppm

parallel:
	OMP_NUM_THREADS=$(THREADS) time ./mandelbrot 0.27085 0.27100 0.004640 0.004810 1000 8192 pic.ppm
	sha1sum pic.ppm

png: pic.ppm
	MAGICK_CONFIGURE_PATH=. convert -negate -normalize -fill blue -tint 100 pic.ppm pic.png

.PHONY: clean
clean:
	rm -f mandelbrot pic.ppm pic.png
