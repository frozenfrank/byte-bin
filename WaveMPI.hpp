#pragma once
#include <mpl/mpl.hpp>
#include "Wave.hpp"



namespace {
    // Read an element of type T from a certain offset (in bytes) in an mpl::file
    template <class T>
    T read_at_all(auto &f, auto offset) {
        std::remove_const_t<T> ret;
        f.read_at_all(offset, ret);
        return ret;
    }
}


class WaveMPI: public Wave {
    // MPI-related members (initialized at the bottom of this file)
    static mpl::communicator comm_world;
    static const int comm_rank;
    static const int comm_size;


    // Determine which cells this process is in charge of updating
    auto this_process_cell_range() const {
        return wr::split_range(rows, comm_rank, comm_size);
    }

    // Read a Wave from an mpl::file
    WaveMPI(mpl::file &&f): Wave(read_at_all<decltype(ndims)>(f, 0),
                                     read_at_all<decltype(rows)>(f, sizeof(ndims)),
                                     read_at_all<decltype(cols)>(f, sizeof(ndims) + sizeof(rows)),
                                     read_at_all<decltype(c)>(f, sizeof(ndims) + sizeof(rows) + sizeof(cols))){
                                    // need to fix so doesn't over allocate vectors by default
                                    //read_at_all<decltype(t)>(f, sizeof(ndims) + sizeof(rows) + sizeof(cols) + sizeof(c))) { // initialize u and v to minimum size; they're resized below


        // Figure out which cells this process is in charge of
        auto [first, last] = this_process_cell_range();
        if (first > 0)     first -= 1; // include top halo
        if (last  < rows) last  += 1; // include bottom halo

        // Resize the vectors
        u.resize((last-first)*cols);
        v.resize((last-first)*cols);
        
        // // Figure out read offsets
        auto u_offset = header_size + sizeof(double) * first * cols; // if it's the first row, it will point to front. Otherwise, middle
        auto v_offset = u_offset + sizeof(double) * rows * cols;    // u_offset + all of u  (or a size of u that puts us in the correct middle)  

        // // Read
        auto layout = mpl::vector_layout<double>(u.size());
        f.read_at(u_offset, u.data(), layout);
        f.read_at(v_offset, v.data(), layout);
    }



public:
    // Read a Wave from a file with MPI I/O, handling errors gracefully
    WaveMPI(const char *filename) try: WaveMPI(mpl::file(comm_world, filename,
                                                                 mpl::file::access_mode::read_only)) {
                                           } catch (const mpl::io_failure &e) {
                                               handle_read_failure(filename);
                                           }



    // Write a Wave to a file with MPI I/O, handling errors gracefully
    void write(const char *filename) const override try {
        // Open file write-only
        auto f = mpl::file(comm_world, filename, mpl::file::access_mode::create|mpl::file::access_mode::write_only);

        // Write header
        f.write_all(ndims);
        f.write_all(rows);
        f.write_all(cols);
        f.write_all(c);
        f.write_all(t);

        // Figure out which part of u and v this process is in charge of writing
        auto [first, last] = this_process_cell_range(); // https://tinyurl.com/byusc-structbind
        
        auto layout = mpl::vector_layout<double>((last-first)*cols);
        auto u_offset = header_size + sizeof(double) * first * cols;
        auto v_offset = u_offset + sizeof(double) * rows * cols;
        auto halo_offset = comm_rank == 0 ? 0 : 1;
        halo_offset *= cols;

        // Write body
        f.write_at(u_offset, u.data()+halo_offset, layout);
        f.write_at(v_offset, v.data()+halo_offset, layout);

        // Handle errors
    } catch (const mpl::io_failure &e) {
        handle_write_failure(filename);
    }
 


    // Steepness derivative
    double energy() override {
        // Local and global dsteepness holders
        double global_e, local_e = 0;

        auto [first, last] = this_process_cell_range();
        auto local_rows = last - first;
        if ((comm_rank == 0) || (comm_rank == comm_size - 1)){
            local_rows += 1; // gets a top OR bottom halo
        }
        else {
            local_rows += 2; // gets a top AND bottom halo
        }

        // Dynamic Energy
        for (int i = 1; i < local_rows - 1; i++){ // skips the top halo, boundary (top row) is never updated on true row 0
            for (int j = 1; j < cols - 1; j++){
                local_e += pow(v[i * cols + j], 2) / 2;
            }   	
        }
        
        // Potential energy
        int first_row = comm_rank == 0 ? 0 : 1;
        for (int i = first_row; i < local_rows - 1 ; i++){
            for (int j = 1; j < cols - 1; j++){
                local_e += pow((u[i * cols + j] - u[(i+1) * cols + j]), 2) / 4;
            }   	
        }

        for (int i = 1; i < local_rows - 1; i++){
            for (int j = 0; j < cols - 1; j++){
                local_e += pow((u[i * cols + j] - u[i * cols + j+1]), 2) / 4;
            }   	
        }

        // Sum the e from all processes and return it
        comm_world.allreduce(std::plus<>(), local_e, global_e);

        return global_e;
    }



private:
    // Swap halo cells between processes to keep simulation consistent between processes
    void exchange_halos(auto &x) {

        auto layout = mpl::vector_layout<double>(cols);

        // Tags for sends and receives
        auto from_above_tag  = mpl::tag_t{0}, from_below_tag = mpl::tag_t{1}; // direction of data flow is indicated

        // Exchange halos with the process to the left if there is such a process
        if (comm_rank > 0) {
            comm_world.sendrecv(x.data()+cols, layout, comm_rank-1, from_below_tag,
                                x.data(), layout, comm_rank-1, from_above_tag);
        }
        // Exchange halos with the process to the right if this process has a real end halo
        if (comm_rank < comm_size-1) {
            comm_world.sendrecv(x.data()+x.size()-2*cols, layout, comm_rank+1, from_above_tag,
                                x.data()+x.size()-cols, layout, comm_rank+1, from_below_tag);
        }

    }



public:
    // Iterate from t to t+dt in one step
    double step(double dt) override {

        auto [first, last] = this_process_cell_range();
        auto local_rows = last - first;
        if ((comm_rank == 0) || (comm_rank == comm_size - 1)){
            local_rows += 1; // gets a top OR bottom halo
        }
        else {
            local_rows += 2; // gets a top AND bottom halo
        }

        // Update v
        for (int i = 1; i < local_rows - 1; i++){
		    for (int j = 1; j < cols - 1; j++){
                auto L = (u[(i-1) * cols + j] + u[(i+1) * cols + j] + u[i * cols + j-1] + u[i * cols + j+1]) / 2 - 2 * u[i * cols + j];
			    v[i * cols + j] = (1 - dt * c) * v[i * cols + j] + dt * L;
	    	}   	
	    }
        exchange_halos(v);

        // Update u
        for (int i = 1; i < local_rows - 1; i++){
		    for (int j = 1; j < cols - 1; j++){
                u[i * cols + j] += v[i * cols + j] * dt;
	    	}   	
	    }
        exchange_halos(u);

        

        // // Enforce boundary condition
        // if (global_first == 0)    g[0]          = g[1];
        // if (global_last == cells) g[g.size()-1] = g[g.size()-2];

        // Increment and return t
        t += dt;
        return t;
    }
};



// Initialize static MPI-related members
// In C++, static member variables need to be defined and initialized outside of the class definition.
// The reason for this separation is that static member variables belong to the class as a whole, not to individual objects of the class. 
mpl::communicator WaveMPI::comm_world = mpl::environment::comm_world();
const int WaveMPI::comm_rank = mpl::environment::comm_world().rank();
const int WaveMPI::comm_size = mpl::environment::comm_world().size();