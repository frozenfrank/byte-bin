#include <iostream>
#include "Wave.hpp"

// Compile with -DUSE_OPENMP for OpenMP version, -DUSE_THREAD for pthread version, etc.
#if defined(USE_MPI)
#include "WaveMPI.hpp"
using WaveOrth = WaveMPI;
#else
#include "Wave.hpp"
using WaveOrth = Wave;
#endif

// Print function that will only print in the first process if MPI is being used
namespace {
    enum class to { stdout, stderr };
    template <to S=to::stdout>
    void print(auto && ...args) {
#ifdef MPI_VERSION
        if (mpl::environment::comm_world().rank() > 0) return; // only print in the main thread
#endif
        if constexpr (S==to::stdout) {
            (std::cout << ... << args);
            std::cout << std::endl;
        } else {
            (std::cerr << ... << args);
            std::cerr << std::endl;
        }
    }
};


int main(int argc, char **argv) {
    // Function to print a help message
    auto help = [=](){
        print("Usage: ", argv[0], " infile outfile");
        print("Read a wave orthotope from infile, solve it, and write it to outfile.");
        print("`", argv[0], " --help` prints this message.");
    };

    // Parse
    if (argc > 1 && (std::string(argv[1]) == std::string("-h") || std::string(argv[1]) == std::string("--help"))) {
        help();
        return 0;
    }
    if (argc != 3) {
        print<to::stderr>("Exactly two arguments must be supplied.");
        help();
        return 2;
    }

    auto infile = argv[1];
    auto outfile = argv[2];



    auto w = WaveOrth(infile);
    

    // Solve and print result
    w.solve();
    w.write(outfile);
    std::cout << w.sim_time() << std::endl;
    return 0;
}
