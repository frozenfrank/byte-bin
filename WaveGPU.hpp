#ifndef WAVE_GPU_H
#define WAVE_GPU_H
#include <array>
#include <vector>
#include <iostream>
#include <cstdint>
#include <cmath>
#include <algorithm>
#include <numeric>
#include <execution>
#include <math.h>

class WaveGPU {
    // Types
    using size_type = size_t;
    using value_type = double;
    //using value_type = unsigned long int;
    // Members
    const size_type m, n;              // size
    const value_type c;                // damping coefficient
    value_type t;                      // simulation time
    std::vector<value_type> disp, vel; // displacement and velocity arrays

public:

    WaveGPU(const auto m, const auto n, const auto c, const value_type t=0): m(m), n(n), c(c), t(t), disp(m*n), vel(m*n) {}

    constexpr const auto size() const { return std::array{m, n}; }

    constexpr       value_type  u(const auto i, const auto j) const { return disp[i*n+j]; }
    constexpr       value_type& u(const auto i, const auto j)       { return disp[i*n+j]; }


    constexpr       value_type  v(const auto i, const auto j) const { return vel [i*n+j]; }
    constexpr       value_type& v(const auto i, const auto j)       { return vel [i*n+j]; }


    value_type energy() const {
        value_type E{};

        // Calculate total energy

        // Dynamic energy
        // int last = m - 1;

        // E = std::transform_reduce(std::execution::par_unseq, 1, last, value_type{0},
        //     std::plus<>{}, // reduce
        //     [vel=vel.data(), n=n](auto i){ // transform
        //         for (int j = 1; j < n - 1; j++){
        //             return pow(vel[i * n + j], 2) / 2;
        //         }  
        //     });

        #pragma omp parallel for reduction(+:E)
        for (int i = 1; i < m - 1; i++){
		    for (int j = 1; j < n - 1; j++){
                E += pow(vel[i * n + j], 2) / 2;
	    	}   	
	    }

        // E += std::transform_reduce(std::execution::par_unseq, 1, last, value_type{0},
        //         std::plus<>{},
        //         [disp=disp.data(), n=n](auto i){
        //             for (int j = 1; j < n - 1; j++){
        //                 return pow((disp[i * n + j] - disp[(i+1) * n + j]), 2) / 4;
        //             }   
        //         });

        // Potential energy
        #pragma omp parallel for reduction(+:E)
        for (int i = 0; i < m - 1; i++){
		    for (int j = 1; j < n - 1; j++){
                E += pow((disp[i * n + j] - disp[(i+1) * n + j]), 2) / 4;
	    	}   	
	    }

        // E += std::transform_reduce(std::execution::par_unseq, 1, last, value_type{0},
        //         std::plus<>{},
        //         [disp=disp.data(), n=n](auto i){
        //             for (int j = 0; j < n - 1; j++){
        //                 return pow((disp[i * n + j] - disp[i * n + j+1]), 2) / 4;
        //             }    
        //         });

        #pragma omp parallel for reduction(+:E)
        for (int i = 1; i < m - 1; i++){
		    for (int j = 0; j < n - 1; j++){
                E += pow((disp[i * n + j] - disp[i * n + j+1]), 2) / 4;
	    	}   	
	    }
        
        return E;
    }

    value_type step() {
        const value_type dt = 0.01;
    
        // Update v
        
        // int last = m - 1;
        // std::for_each(std::execution::par_unseq, 1, last,
        //     [disp=disp.data(), vel=vel.data(), n=n, dt=dt, c=c](auto i){
        //         for (int j = 1; j < n - 1; j++){
        //             value_type L = (disp[(i-1) * n + j] + disp[(i+1) * n + j] + disp[i * n + j-1] + disp[i * n + j+1]) / 2 - 2 * disp[i * n + j];
        //             vel[i * n + j] = (1 - dt * c) * vel[i * n + j] + dt * L;
        //         }  
        //     });

        #pragma omp parallel for
        for (int i = 1; i < m - 1; i++){
		    for (int j = 1; j < n - 1; j++){
                value_type L = (disp[(i-1) * n + j] + disp[(i+1) * n + j] + disp[i * n + j-1] + disp[i * n + j+1]) / 2 - 2 * disp[i * n + j];
			    vel[i * n + j] = (1 - dt * c) * vel[i * n + j] + dt * L;
	    	}   	
	    }

        // Update u

        // std::for_each(std::execution::par_unseq, 1, last,
        //     [disp=disp.data(), vel=vel.data(), n=n, dt=dt, c=c](auto i){
        //         for (int j = 1; j < n - 1; j++){
        //             disp[i * n + j] += vel[i * n + j] * dt;
        //         }  
        //     });


        #pragma omp parallel for
        for (int i = 1; i < m - 1; i++){
		    for (int j = 1; j < n - 1; j++){
                disp[i * n + j] += vel[i * n + j] * dt;
	    	}   	
	    }
    
        t += dt;
        return t;
    }

    value_type solve() {
         while (energy() > (m-2)*(n-2)*0.001) {
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
    

};
#endif