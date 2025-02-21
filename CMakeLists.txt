cmake_minimum_required(VERSION 3.20)
set(CMAKE_CXX_FLAGS "-Ofast -DNDEBUG" CACHE STRING "Flags used by the CXX compiler during RELEASE builds")
project(wavesolve CXX)

# Use C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_EXTENSIONS FALSE)
set(CMAKE_CXX_STANDARD_REQUIRED TRUE)

# wavesolve_mpi
find_package(MPI)
if(MPI_CXX_FOUND)
    find_package(mpl REQUIRED)
    add_executable(wavesolve_mpi wavesolve.cpp Wave.hpp WaveMPI.hpp)
    target_link_libraries(wavesolve_mpi PRIVATE MPI::MPI_CXX)
    target_link_libraries(wavesolve_mpi PRIVATE mpl::mpl)
    target_compile_definitions(wavesolve_mpi PUBLIC USE_MPI)
endif()
