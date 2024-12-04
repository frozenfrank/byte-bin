cmake_minimum_required(VERSION 3.20)
set(CMAKE_CXX_FLAGS "-Ofast -DNDEBUG" CACHE STRING "Flags used by the CXX compiler during RELEASE builds")
project(wavesolve CXX)

# Use C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_EXTENSIONS FALSE)
set(CMAKE_CXX_STANDARD_REQUIRED TRUE)

# Build wavesolve_serial
#add_executable(wavesolve_serial wavesolve.cpp Wave.hpp)

#find_package(OpenMP REQUIRED)
#add_executable(optimize optimize.cpp)
#target_link_libraries(optimize PRIVATE OpenMP::OpenMP_CXX)

#find_package(OpenMP REQUIRED)
#add_executable(wavesolve_openmp wavesolve.cpp Wave.hpp)
#target_link_libraries(wavesolve_openmp PRIVATE OpenMP::OpenMP_CXX)

#find_package(Threads REQUIRED)
#add_executable(wavesolve_thread blah.cpp)
#target_link_libraries(blah PRIVATE Threads::Threads)

# wavesolve_mpi
find_package(MPI)
if(MPI_CXX_FOUND)
    find_package(mpl REQUIRED)
    add_executable(wavesolve_mpi wavesolve.cpp Wave.hpp WaveMPI.hpp)
    target_link_libraries(wavesolve_mpi PRIVATE MPI::MPI_CXX)
    target_link_libraries(wavesolve_mpi PRIVATE mpl::mpl)
    target_compile_definitions(wavesolve_mpi PUBLIC USE_MPI)
endif()
