cmake_minimum_required(VERSION 3.19)
set(CMAKE_CXX_FLAGS_RELEASE "-Ofast -DNDEBUG" CACHE STRING "Flags used by the CXX compiler during RELEASE builds")
project(wavesolve CXX)

# Use C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_EXTENSIONS FALSE)
set(CMAKE_CXX_STANDARD_REQUIRED TRUE)

# Build wavesolve_serial
add_executable(wavesolve_serial WaveOrthotopeOpenMP.cpp WaveOrthotopeSharedMem.hpp WaveOrthotope.hpp binary_io.hpp)

find_package(OpenMP REQUIRED)
add_executable(optimize optimize.cpp)
target_link_libraries(optimize PRIVATE OpenMP::OpenMP_CXX)

find_package(OpenMP REQUIRED)
add_executable(wavesolve_openmp WaveOrthotopeOpenMP.cpp WaveOrthotopeSharedMem.hpp WaveOrthotope.hpp binary_io.hpp)
target_link_libraries(wavesolve_openmp PRIVATE OpenMP::OpenMP_CXX)
