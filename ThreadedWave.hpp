#ifndef THREADED_WAVE_H
#define THREADED_WAVE_H
#include <array>
#include <vector>
#include <iostream>
#include <math.h>
#include <cstring>
#include <charconv>
#include <ranges>
#include <thread>
#include <semaphore>
#include <atomic>
#include <barrier>
#include "CoordinatedLoopingThreadpool.hpp"
#include "utils.hpp"
#include "binary_io.hpp"

class ThreadedWave {
    // Types
    using size_type = size_t;
    using value_type = double;
    //using value_type = unsigned long int;
    // Members
    const size_type m, n;              // size
    const value_type c;                // damping coefficient
    value_type t;                      // simulation time
    std::vector<value_type> disp, vel; // displacement and velocity arrays

    // Threading vars
    const size_type nthreads;
    CoordinatedLoopingThreadpool energy_workers, step_workers;
    std::atomic<value_type> energy_aggregator;
    std::barrier<> step_barrier, energy_barrier;
    value_type iter_time_step;

public:
    // Constructor
    ThreadedWave(const auto m, const auto n, const auto c, const value_type t=0): m(m), n(n), c(c), t(t), disp(m*n), vel(m*n),
        nthreads{[]{
                size_type nthreads = 1;
                auto nthreads_str = std::getenv("SOLVER_NUM_THREADS");
                if (nthreads_str != nullptr) std::from_chars(nthreads_str, nthreads_str+std::strlen(nthreads_str), nthreads);
                return nthreads;
            }()},
            energy_workers([this, n, m](auto tid){
                
                auto [first, last] = wave_utils::divided_cell_range(m-1, tid, nthreads);
                energy_barrier.arrive_and_wait();
                
                value_type energy_local = 0;
                value_type energy_potential = 0;
                value_type energy_kinetic = 0;
                
                if (first == 0){
                    for (int j = 1; j < n - 1; j++){
                       energy_local += pow(disp[j] - disp[n +j], 2); // PE(disp[0,j], disp[1,j]) no more divide by 4
                    }
                }

                energy_local = energy_local / 4;
                
                // energy_barrier.arrive_and_wait();
                int max = 1;
                if (first > 1){
                    max = first;
                }

                for (int i = max; i < last; i++) {
                    int row = i * n;
                    energy_potential += pow(disp[row] - disp[(row) + 1], 2); // PE(disp[i, 0], disp[i, 1])
                    for (int j = 1; j < n - 1; j++){
                        // PE(disp[i,j], disp[i, j+1])
                        energy_potential += pow(disp[(row) + j] - disp[(row) + (j + 1)], 2);
                        
                        // PE(disp[i,j], disp[i+1, j])
                        energy_potential += pow(disp[(row) + j] - disp[((i+1) * n) + (j)], 2);

                        // KE(vel[i,j])
                        energy_kinetic += pow(vel[row + j], 2);
                    }
                }

                energy_potential = energy_potential / 4;
                energy_kinetic = energy_kinetic / 2;

                energy_local += energy_potential + energy_kinetic;
                                
                energy_aggregator += energy_local;
                energy_barrier.arrive_and_wait();

            }, std::views::iota(0ul, nthreads)),
            step_workers([this, n, m, c](auto tid){
                const value_type dt = 0.01;
                auto one_minus_dt_times_c = 1 - dt * c;

                auto [first, last] = wave_utils::divided_cell_range(m-1, tid, nthreads);

                if (first == 0){
                    first = 1;
                }

                // Update v
                for (int i = first; i < last; i++){
                    int row = i * n;
                    for (int j = 1; j < n - 1; j++){
                        value_type L = (disp[(i-1) * n + j] + disp[(i+1) * n + j] + disp[row + j-1] + disp[row + j+1]) / 2 - 2 * disp[row + j];
                        vel[row + j] = (one_minus_dt_times_c) * vel[row + j] + dt * L;
                    }   	
                }
                step_barrier.arrive_and_wait();
                
                // Update u
                for (int i = first; i < last; i++){
                    int row = i * n;
                    for (int j = 1; j < n - 1; j++){
                        disp[row + j] += vel[row + j] * dt;
                    }   	
                }

                step_barrier.arrive_and_wait();

            }, std::views::iota(0ul, nthreads)),
            step_barrier(nthreads), energy_barrier(nthreads)
            {}

    // Return the size as a std::array
    constexpr const auto size() const { return std::array{m, n}; }

    // Displacement indexing
    constexpr const value_type  u(const auto i, const auto j) const { return disp[i*n+j]; }
    constexpr       value_type& u(const auto i, const auto j)       { return disp[i*n+j]; }

    // Displacement velocity indexing
    constexpr const value_type  v(const auto i, const auto j) const { return vel [i*n+j]; }
    constexpr       value_type& v(const auto i, const auto j)       { return vel [i*n+j]; }

    // Return the energy contained in this WaveOrthotope
    const value_type energy() {

        // Calculate total energy

        energy_aggregator = 0;
        energy_workers.trigger_sync();
        //printf("energy ended");

        return energy_aggregator;
    }

    // Advance the membrane in time by dt
    const value_type step() {
        const value_type dt = 0.01;
    
        step_workers.trigger_sync();    
    
        t += dt;
        return t;
    }

    // Advance the membrane in time by steps of dt until the average interior cell energy drops below 0.001
    // not used
    const value_type solve() {
        auto energy_threshold = (m-2)*(n-2)*0.001;
         while (energy() > energy_threshold) {
            step();
         }
        return t;
    }

    // Print out formatted velocity vector
    const auto print_vel() {
        for (int i=0; i < vel.size(); i++){
            if (i % n == 0){
                std::cout << std::endl;
            }
            std::cout << vel[i] << " ";
        }
    }

    // Print out formatted displacement vector
    const auto print_disp() {
        for (int i=0; i < disp.size(); i++){
            if (i % n == 0){
                std::cout << std::endl;
            }
            std::cout << disp[i] << " ";
        }
    }
    
    bool write(unsigned long int n, unsigned long int i, unsigned long int j, double c, double t, std::string out){
        
        // WRITE IT ALL OUT
        std::ofstream os(out);
        bool write_success = write_bytes(os, &n, &i, &j, &c, &t);
        
        double array_data;
        for (int k = 0; k < i; ++k) {
            for (int l = 0; l < j; ++l) {
                array_data = u(k, l);
                write_success = write_bytes(os, &array_data);
            }
        }

        for (int k = 0; k < i; ++k) {
            for (int l = 0; l < j; ++l) {
                array_data = v(k, l);
                write_success = write_bytes(os, &array_data);
            }
        }
        return true;
    }

};
#endif