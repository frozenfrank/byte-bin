cmake_minimum_required(VERSION 3.19)
project(wavesolve CXX)

# Use C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_EXTENSIONS FALSE)
set(CMAKE_CXX_STANDARD_REQUIRED TRUE)

# Build wavesolve_serial
add_executable(wavesolve_serial WaveOrthotopeOpenMP.cpp WaveOrthotopeSharedMem.hpp WaveOrthotope.hpp binary_io.hpp)