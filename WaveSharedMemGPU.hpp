#ifndef WAVE_SHARED_MEM_GPU_H
#define WAVE_SHARED_MEM_GPU_H
#include <cstdlib>
#include <format>
#include <fstream>      // std::ifstream
#include <math.h>
#include <string>
#include "WaveGPU.hpp"
#include "binary_io.hpp"


class WaveSharedMemGPU {

    const std::string inputFile;
    const std::string outputFile;

public:
    WaveSharedMemGPU(const auto input, const auto output): inputFile(input), outputFile(output) {}

    bool solve(){

        // READ IT ALL IN 

        unsigned long int n; // should be 2
        unsigned long int i; // m
        unsigned long int j; // n

        double c;
        double t;

        std::ifstream is(inputFile);
        bool read_success = read_bytes(is, &n, &i, &j, &c, &t);

        double array_data; // PROBLEM CHILD

        WaveGPU wave = WaveGPU(i, j, c);
        for (int k = 0; k < i; ++k) {
            for (int l = 0; l < j; ++l) {
                read_success = read_bytes(is, &array_data);
                wave.u(k, l) = array_data;
            }
        }
        
        for (int k = 0; k < i; ++k) {
            for (int l = 0; l < j; ++l) {
                read_success = read_bytes(is, &array_data);
                wave.v(k, l) = array_data;
            }
        } 

        // SOLVE
        char* INTVL = (std::getenv("INTVL"));
        float interval = 0;
        if (INTVL != NULL){
            interval = std::stod(INTVL);
        }
        
        while (wave.energy() > (i-2)*(j-2)*0.001) {
            t = wave.step();
            if (interval > 0 && (fmod(t+0.002, interval)< 0.004)){
                auto check = std::format("chk-{:07.2f}.wo", t);
                write(n, i, j, c, t, wave, check);
            }
        }

        t = wave.solve();

        // Final write
        write(n, i, j, c, t, wave, outputFile);

        return true;
    }

    bool write(unsigned long int n, unsigned long int i, unsigned long int j, double c, double t, WaveGPU wave, std::string out){
        
        // WRITE IT ALL OUT
        std::ofstream os(out);
        bool write_success = write_bytes(os, &n, &i, &j, &c, &t);
        
        double array_data;
        for (int k = 0; k < i; ++k) {
            for (int l = 0; l < j; ++l) {
                array_data = wave.u(k, l);
                write_success = write_bytes(os, &array_data);
            }
        }

        for (int k = 0; k < i; ++k) {
            for (int l = 0; l < j; ++l) {
                array_data = wave.v(k, l);
                write_success = write_bytes(os, &array_data);
            }
        }
        return true;
    }
};


#endif