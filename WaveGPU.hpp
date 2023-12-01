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
#include "cartesian_product.hpp"

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

    auto two_d_range(size_t first_x, size_t last_x, size_t first_y, size_t last_y) const {
        auto range = std::views::cartesian_product(std::views::iota(first_x, last_x),
                                                std::views::iota(first_y, last_y));
        return std::array{range.begin(), range.end()};
    }

    value_type energy() const {
        value_type E{};

        // Calculate total energy

        // Dynamic energy
        auto [first, last] = two_d_range(1, m-1, 1, n-1);
        E = std::transform_reduce(std::execution::par_unseq,
                    /* iteration range */ first, last,
                    /* initial value   */ value_type{0},
                    /* reduce          */ std::plus<>(),
                    /* transform       */ [n=n, vel=vel.data()](auto ij){
                                                auto [i, j] = ij;
                                                return std::pow(vel[i * n + j], 2) / 2;
                                            });

        // Potential energy
        auto [first_p, last_p] = two_d_range(0, m-1, 1, n-1);
        E += std::transform_reduce(std::execution::par_unseq,
                    /* iteration range */ first_p, last_p,
                    /* initial value   */ value_type{0},
                    /* reduce          */ std::plus<>(),
                    /* transform       */ [n=n, disp=disp.data()](auto ij){
                                                auto [i, j] = ij;
                                                return std::pow((disp[i * n + j] - disp[(i+1) * n + j]), 2) / 4;
                                            });
        
        auto [first_p2, last_p2] = two_d_range(1, m-1, 0, n-1);
        E += std::transform_reduce(std::execution::par_unseq,
                    /* iteration range */ first_p2, last_p2,
                    /* initial value   */ value_type{0},
                    /* reduce          */ std::plus<>(),
                    /* transform       */ [n=n, disp=disp.data()](auto ij){
                                                auto [i, j] = ij;
                                                return std::pow((disp[i * n + j] - disp[i * n + j+1]), 2) / 4;
                                            });
        
        return E;
    }

    value_type step() {
        const value_type dt = 0.01;
    
        // Update v
        
        auto [first, last] = two_d_range(1, m-1, 1, n-1);
        auto one_minus_dt_times_c = 1 - dt * c;
        std::for_each(std::execution::par_unseq,
            /* iteration range */ first, last,
            /* transform       */ [n=n, disp=disp.data(), vel=vel.data(), one_minus_dt_times_c=one_minus_dt_times_c, dt=dt](auto ij){
                                        auto [i, j] = ij;
                                        auto I = i * n + j;
                                        auto L = (disp[I-1] + disp[I+1] + disp[I-n] + disp[I+n]) / 2 - 2 * disp[I];
                                        vel[I] = one_minus_dt_times_c * vel[I] + dt * L;
                                    });

        // Update u
        auto [first_u, last_u] = two_d_range(1, m-1, 1, n-1);
        std::for_each(std::execution::par_unseq,
            /* iteration range */ first_u, last_u,
            /* transform       */ [n=n, disp=disp.data(), vel=vel.data(), dt=dt](auto ij){
                                        auto [i, j] = ij;
                                        auto I = i * n + j;
                                        disp[I] += vel[I] * dt;
                                    });
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