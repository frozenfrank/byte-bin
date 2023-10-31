#include <iostream>
#include <ostream>
#include "ThreadedSharedMem.hpp"

int main(int argc, char** argv){
    if (argc != 3) {
        std::cout << "Please provide an input file and output file on the command line \n";
    }

    auto inputfile = argv[1];
    auto outputfile = argv[2];
    
    auto w = ThreadedSharedMem(inputfile, outputfile);
    w.solve();
    return 0;
}