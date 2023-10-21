#include <iostream>
#include <vector>
#include <span>
#include <cmath>



auto interior(auto &x) {
    return std::span(x.begin()+1, x.end()-1);
}



auto laplacian(auto &x, auto &i, auto &j) {
    return (x[i][j-1] + x[i][j+1] + x[i-1][j] + x[i+1][j]) / 2 - 2 * x[i][j];
}



auto energy_floor(auto &u) {
    return (u.size() - 2) * (u.front().size() - 2) * 0.001;
}



auto energy(auto &u, auto &v, auto &m, auto &n, auto& half_bound) {
    double E{};
    
    // Lines 31-52 contains my original code submission
    
    // Dynamic
    //#pragma omp parallel for reduction(+:E)
    // for (auto row: interior(v)) {
    //    for (auto v_ij: interior(row)) {
    //        E += std::pow(v_ij, 2) / 2;
    //    }
    // }

    // Potential
    // #pragma omp parallel for reduction(+:E)
    // for (size_t i=0; i<m-1; i++) {
    //     for (size_t j=1; j<n-1; j++) {
    //         E += std::pow(u[i][j]-u[i+1][j], 2) / 4;
    //     }
    // }

    // #pragma omp parallel for reduction(+:E)
    // for (size_t i=1; i<m-1; i++) {
    //     for (size_t j=0; j<n-1; j++) {
    //         E += std::pow(u[i][j]-u[i][j+1], 2) / 4;
    //     }
    // }


    // EDITS AND THOUGHT PROCESS FOR PHASE 5
    
    // For the dynamic calculation, it originally used the interior(v) function
    // One group member suggested that switching to the old school way is faster...
    // I didn't notice a difference, but ending up going faster later so it's commented

    // for (size_t i=1; i < m-1; i++){          // no more interior()
    //     for (size_t j=1; j < n-1; j++){      // no more interior()
    //         E += std::pow(v[i][j], 2) / 2;
    //     }
    // } 

    
    // Symmetry
    // Tbh throwing in the diagonal to make it 8 sections really made my head hurt
    // I figured it out for the dynamic energy calculation, but 3 hours were up before I could apply it to eveything
    // Most of it will just focus on the 4 squares of symmetry

    // So the values on the diagonal (ex: v[1][1], v[2][2], etc.) get multiplied by 4 (four diagonals)
    // whereas the other values in the 8th section get multiplied by 8 (eight sections)

    // Originally I tried with the different parts of symmetry being different vars, but it's faster this way.
    // That's mostly because I didn't bother to figure out mpi with it
    
    // double e_tri = 0;     // not fast
    // double e_diag = 0;    // not fast
    
    #pragma omp parallel for reduction(+:E)
    for (size_t i=1; i <= half_bound; i++){
        for (size_t j=i; j <= half_bound; j++){
            if (j == i) { // this was actually faster than a seperate for loop for the diagnals
                E += std::pow(v[i][i], 2) * 2; // there are 4 diagonals, but I removed the divide by two
            }
            else {
                E += std::pow(v[i][j], 2) * 4; // there are 8 sections, but I removed the divide by two
            }
            
        }
    }

    // I was curious if the if statement would slow it down more or less then 4 sections
    // It was still faster as the following code was slower
    // #pragma omp parallel for reduction(+:E)
    // for (size_t i=1; i <= half_bound; i++){
    //     for (size_t j=1; j <= half_bound; j++){
    //         E += std::pow(v[i][j], 2) * 2;
    //     }
    // } 


    // Potential energy is calculated based on the quarters
    
    // Potential

    #pragma omp parallel for reduction(+:E)
    for (size_t i=0; i<=half_bound; i++) { // bounds changed
        for (size_t j=1; j<=half_bound; j++) {
            E += std::pow(u[i][j]-u[i+1][j], 2); // divide by 4 goes away because it's multiplied by 4
        }
    }   

    #pragma omp parallel for reduction(+:E)
    for (size_t i=1; i<=half_bound; i++) {
        for (size_t j=0; j<=half_bound; j++) {
            E += std::pow(u[i][j]-u[i][j+1], 2); // divide by 4 goes away because it's multiplied by 4
        }
    }


    return E;
}



auto step(auto &u, auto &v, auto &c, auto &dt, auto& half_bound, auto& one_minus_dt_times_c) {
    auto m = u.size(), n = u.front().size();

    // Lines 134-149 contain my original submission

    // // Update v
    // #pragma omp parallel for
    // for (size_t i=1; i<m-1; i++) {
    //     for (size_t j=1; j<n-1; j++) {
    //         auto L = laplacian(u, i, j);
    //         v[i][j] = (1 - dt * c) * v[i][j] + dt * L;
    //     }
    // }

    // // Update u
    // #pragma omp parallel for
    // for (size_t i=1; i<m-1; i++) {
    //     for (size_t j=1; j<n-1; j++) {
    //         u[i][j] += dt * v[i][j];
    //     }
    // }

    // Basically I did the same quartering thing as above
    
    // Update v
    #pragma omp parallel for
    for (size_t i=1; i<=half_bound+1; i++) { // changed the bounds to be quarters, tbh tho I'm not sure why it's a "+1" on all of them
        for (size_t j=1; j<=half_bound+1; j++) { // changed the bounds to be quarters
            auto L = laplacian(u, i, j);
            v[i][j] = one_minus_dt_times_c * v[i][j] + dt * L; // took out repetitive calculation
        }
    }

    // Update u
    #pragma omp parallel for
    for (size_t i=1; i<=half_bound+1; i++) { // changed the bounds to be quarters
        for (size_t j=1; j<=half_bound+1; j++) { // changed the bounds to be quarters
            u[i][j] += dt * v[i][j];
        }
    }
}



int main() {
    // Simulation parameters
    const int rows = 800;
    const double c = 0.05,
                 dt = 0.01,
                 u0 = 1, v0 = 0;
    double t = 0;

    // Added the next two to avoid repeat calculations
    const int half_bound = 399;
    const double one_minus_dt_times_c = (1 - dt * c);

    // Initialize u and v
    auto u = std::vector<std::vector<double>>(rows, std::vector<double>(rows));
    auto v = u;
    for (auto &row: interior(u)) std::fill(interior(row).begin(), interior(row).end(), u0);

    // Solve
    auto energyfloor = energy_floor(u);
    auto m = u.size(), n = u.front().size();
    while (energy(u, v, m, n, half_bound) > energyfloor) {
        step(u, v, c, dt, half_bound, one_minus_dt_times_c);
        t += dt;
    }

    // Print simulation time and exit
    std::cout << t << std::endl;
    return 0;
}

