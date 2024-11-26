CC = gcc
CFLAGS =
# CFLAGS = -Wall -O2 -g -I ../include/

MAND_COORDS = 0.27085 0.27100 0.004640 0.004810 1000 8192

THREADS ?= 1

.PHONY: all
all: mandelbrot-sequential mandelbrot-parallel

mandelbrot-sequential: mandelbrot.c
	$(CC) $(CFLAGS) -o mandelbrot-seq mandelbrot.c

mandelbrot-parallel: mandelbrot.c
	$(CC) $(CFLAGS) -o mandelbrot-par mandelbrot.c -fopenmp

sequential:
	time ./mandelbrot-seq $(MAND_COORDS) pic.ppm
	sha1sum pic.ppm
	cp pic.ppm pic-seq.ppm

parallel:
	OMP_NUM_THREADS=$(THREADS) time ./mandelbrot-par $(MAND_COORDS) pic.ppm
	sha1sum pic.ppm
	cp pic.ppm pic-par.ppm

png: pic.ppm
	MAGICK_CONFIGURE_PATH=. convert -negate -normalize -fill blue -tint 100 pic.ppm pic.png

.PHONY: clean
clean:
	rm -f mandelbrot pic*.ppm pic.png
