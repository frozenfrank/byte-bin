cmake_minimum_required(VERSION 3.19)
set(CMAKE_CXX_FLAGS_RELEASE "-Ofast -DNDEBUG" CACHE STRING "Flags used by the CXX compiler during RELEASE builds")
project(wavesolve CXX)

# Use C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_EXTENSIONS FALSE)
set(CMAKE_CXX_STANDARD_REQUIRED TRUE)

# Build wavesolve_serial
#add_executable(wavesolve_serial WaveOrthotopeOpenMP.cpp WaveOrthotopeSharedMem.hpp WaveOrthotope.hpp binary_io.hpp)

#find_package(OpenMP REQUIRED)
#add_executable(optimize optimize.cpp)
#target_link_libraries(optimize PRIVATE OpenMP::OpenMP_CXX)

#find_package(OpenMP REQUIRED)
#add_executable(wavesolve_openmp WaveOrthotopeOpenMP.cpp WaveOrthotopeSharedMem.hpp WaveOrthotope.hpp binary_io.hpp)
#target_link_libraries(wavesolve_openmp PRIVATE OpenMP::OpenMP_CXX)

#find_package(Threads REQUIRED)
#add_executable(wavesolve_threaded Threaded.cpp ThreadedSharedMem.hpp ThreadedWave.hpp binary_io.hpp CoordinatedLoopingThreadpool.hpp)
#target_link_libraries(wavesolve_threaded PRIVATE Threads::Threads)

if("${CMAKE_CXX_COMPILER_ID}" STREQUAL NVHPC)
    message("-- Found nvc++, will build wavesolve_gpu")
    set(NVCXX_COMPUTE_CAPABILITY "60" CACHE STRING "nvc++ GPU compute capability")
    set(NVCXX_CPU_ARCHITECTURE "haswell" CACHE STRING "CPU architecture that nvc++ will compile for")
    
    add_executable(wavesolve_gpu WaveOrthotopeGPU.cpp binary_io.hpp WaveSharedMemGPU.hpp WaveGPU.hpp)
    
    target_compile_options(wavesolve_gpu PRIVATE
                           "-tp=${NVCXX_CPU_ARCHITECTURE}" "-stdpar=gpu" "-gpu=sm_${NVCXX_COMPUTE_CAPABILITY}")
    target_link_options(   wavesolve_gpu PRIVATE
                           "-tp=${NVCXX_CPU_ARCHITECTURE}" "-stdpar=gpu" "-gpu=sm_${NVCXX_COMPUTE_CAPABILITY}")
else()
    message("-- Did not find nvc++, won't build wavesolve_gpu")
endif()
