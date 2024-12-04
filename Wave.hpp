#pragma once
#include <cstdlib>      // For std::getenv
#include <charconv>     // For std::from_chars
#include <cstring>      // For std::strlen
#include <cmath>        // For fmod
#include <format>
#include <fstream>
#include <filesystem>
#include <vector>
#include <math.h>
#include "binary_io.hpp"


// Namespace for split_range, which is used by MPI implementations
namespace wr {
    // Divide [0, n) evenly among size processes, returning the range appropriate for rank [0, size).
    // Example: divide 100 cells among 3 threads, ignoring the first and last cells since they aren't updated:
    //   - split_range(100, 0, 3) -> [0, 34]
    //   - split_range(100, 1, 3) -> [34, 67]
    //   - split_range(100, 2, 3) -> [67, 100]
    auto split_range(auto n, auto rank, auto size) {
        auto n_per_proc = n / size;
        decltype(rank) extra = n % size;
        auto first = n_per_proc * rank + std::min(rank, extra);
        auto last = first + n_per_proc;
        if (rank < extra) {
            last += 1;
        }
        return std::array{first, last};
    }
}


class Wave {
protected:
    static constexpr const double default_dt = 0.01;
    unsigned long int ndims;
    const unsigned long int rows, cols;  // size
    const double c;           // damping coefficient
    double t;                 // simulation time
    std::vector<double> u, v; // displacement and velocity; size is rows*cols
    const std::string outputFile;
    static constexpr const size_t header_size = sizeof(ndims) + sizeof(rows) + sizeof(cols) + sizeof(c) + sizeof(t);


    static void handle_read_failure(const char *const filename) {
        throw std::logic_error("Failed to read from " + std::string(filename));
    }

    static void handle_write_failure(const char *const filename) {
        throw std::logic_error("Failed to write to " + std::string(filename));
    }

    // Read in a Wave from a stream
    Wave(std::istream &&s): ndims{try_read_bytes<decltype(ndims)>(s)},
                                     rows{try_read_bytes<decltype(rows)>(s)},
                                     cols{try_read_bytes<decltype(cols)>(s)},
                                     c{try_read_bytes<decltype(c)>(s)},
                                     t{try_read_bytes<decltype(t)>(s)},
                                     u(rows*cols),
                                     v(rows*cols) {
  
        // Read in u and v
        try_read_bytes(s, u.data(), u.size());
        try_read_bytes(s, v.data(), v.size());

        // std::cout << "dims: " << ndims << "rows: "  << rows << "cols: " << cols << "c: " << c << "t: " << t << std::endl;
    }

public:
    Wave(auto ndims, auto rows, auto cols, auto damping_coefficient): ndims(ndims), rows(rows), cols(cols), c{damping_coefficient}, t{0}, u(rows*cols), v(rows*cols) {}

    // Read a Wave from a file, handling read errors gracefully
    Wave(const char *filename) try: Wave(std::ifstream(filename)) {
                                        } catch (const std::ios_base::failure &e) {
                                            handle_read_failure(filename);
                                        } catch (const std::filesystem::filesystem_error &e) {
                                            handle_read_failure(filename);
                                        }


    // Write a Wave to a file, handling write errors gracefully
    virtual void write(const char *filename) const {
        // Open the file
        auto f = std::ofstream(filename);

        try {
            // Write the header
            try_write_bytes(f, &ndims, &rows, &cols, &c, &t);

            // Write the body
            try_write_bytes(f, u.data(), u.size());
            try_write_bytes(f, v.data(), v.size());

        // Handle write failures
        } catch (const std::filesystem::filesystem_error &e) {
            handle_write_failure(filename);
        } catch (const std::ios_base::failure &e) {
            handle_write_failure(filename);
        }
    }

    auto &displacement(auto i, auto j) { return u[i*cols+j]; }
    auto &velocity(    auto i, auto j) { return v[i*cols+j]; }

    auto sim_time() const { return t; }

    virtual double energy() { 
        double E = 0;

        // Dynamic energy
        #pragma omp parallel for reduction(+:E)
        for (int i = 1; i < rows - 1; i++){
		    for (int j = 1; j < cols - 1; j++){
                E += pow(v[i * cols + j], 2) / 2;
	    	}   	
	    }

        // Potential energy
        #pragma omp parallel for reduction(+:E)
        for (int i = 0; i < rows - 1; i++){
		    for (int j = 1; j < cols - 1; j++){
                E += pow((u[i * cols + j] - u[(i+1) * cols + j]), 2) / 4;
	    	}   	
	    }

        #pragma omp parallel for reduction(+:E)
        for (int i = 1; i < rows - 1; i++){
		    for (int j = 0; j < cols - 1; j++){
                E += pow((u[i * cols + j] - u[i * cols + j+1]), 2) / 4;
	    	}   	
	    }
        return E;
    }
     
    virtual double step(double dt) {
    
        // Update v
        #pragma omp parallel for
        for (int i = 1; i < rows - 1; i++){
		    for (int j = 1; j < cols - 1; j++){
                auto L = (u[(i-1) * cols + j] + u[(i+1) * cols + j] + u[i * cols + j-1] + u[i * cols + j+1]) / 2 - 2 * u[i * cols + j];
			    v[i * cols + j] = (1 - dt * c) * v[i * cols + j] + dt * L;
	    	}   	
	    }

        // Update u
        #pragma omp parallel for
        for (int i = 1; i < rows - 1; i++){
		    for (int j = 1; j < cols - 1; j++){
                u[i * cols + j] += v[i * cols + j] * dt;
	    	}   	
	    }
    
        t += dt;
        
        return t;

    } 

    double solve(double dt=default_dt) { 
        // Read checkpoint interval from environment
        double checkpoint_interval = 0;
        auto INTVL = std::getenv("INTVL");
        if (INTVL != nullptr) std::from_chars(INTVL, INTVL+std::strlen(INTVL), checkpoint_interval);

        // step(dt);
        while (energy() > (rows-2)*(cols-2)*0.001) {
            step(dt);
            if (checkpoint_interval > 0 && fmod(t+0.002, checkpoint_interval) < 0.004) {
                auto check_file_name = std::format("chk-{:07.2f}.wo", t);
                write(check_file_name.c_str());
            }
        }

        return t;
    };

    // Print out formatted velocity vector
    const auto print_vel() {
        for (int i=0; i < v.size(); i++){
            if (i % cols == 0){
                std::cout << std::endl;
            }
            std::cout << v[i] << " ";
        }
    }

    // Print out formatted displacement vector
    const auto print_disp() {
        for (int i=0; i < u.size(); i++){
            if (i % cols == 0){
                std::cout << std::endl;
            }
            std::cout << u[i] << " ";
        }
    }
};
