#ifndef BINARY_IO_H
#define BINARY_IO_H
#include <iostream>



// Documentation at https://github.com/BYUHPC/simple-cxx-binary-io



// Namespace for rwbytes, which allows the same templated function to read from an istream or write to an ostream
namespace {
    // Enum to allow templated throwing vs non-throwing versions of rwbytes
    enum Throwing { throwing, non_throwing };

    // Base rwbytes for when Stream is std::istream (data is a pointer to non-const, s.read is used)
    void rwbytes(std::istream &s, auto *const data, const size_t size) {
        s.read(reinterpret_cast<char *const>(data), sizeof(*data)*size);
    }

    // Base rwbytes for when Stream is std::ostream (data is a pointer to const, s.write is used)
    void rwbytes(std::ostream &s, const auto *const data, const size_t size) {
        s.write(reinterpret_cast<const char *const>(data), sizeof(*data)*size);
    }

    // Read or write size elements of data to or from s
    template <class Stream, Throwing t>
    bool rwbytes(Stream &s, auto *const data, const size_t size=1) {
        auto except = s.exceptions();
        if constexpr (t==throwing) s.exceptions(Stream::failbit|Stream::badbit);
        rwbytes(s, data, size);
        if constexpr (t==throwing) s.exceptions(except);
        return s.good();
    }

    // Read or write size elements of data to or from stdin or stdout
    template <class Stream, Throwing t>
    bool rwbytes(auto *const data, const size_t size=1) {
        if constexpr (std::is_same_v<Stream, std::istream>) return rwbytes<Stream, t>(std::cin,  data, size);
        else                                                return rwbytes<Stream, t>(std::cout, data, size);
    }

    // Read or write each specified element to or from s
    template <class Stream, Throwing t>
    bool rwbytes(Stream &s, auto *const ...data) {
        return (rwbytes<Stream, t>(s, data, 1) && ...);
    }

    // Read or write each specified element to or from s
    template <class Stream, Throwing t>
    bool rwbytes(auto *const ...data) {
        return (rwbytes<Stream, t>(data, 1) && ...);
    }
};



// Regular read_bytes and write_bytes functions: forward all args to rwbytes using the appropriate stream type
auto read_bytes     (auto &&...args) { return rwbytes<std::istream, non_throwing>(args...); }
auto try_read_bytes (auto &&...args) { return rwbytes<std::istream,     throwing>(args...); }
auto write_bytes    (auto &&...args) { return rwbytes<std::ostream, non_throwing>(args...); }
auto try_write_bytes(auto &&...args) { return rwbytes<std::ostream,     throwing>(args...); }

// readbytes that takes no pointer, instead returning a value of type T
template <class T, Throwing t=non_throwing>
T read_bytes(std::istream &s=std::cin) {
    std::remove_const_t<T> data{};
    if constexpr(t==throwing) try_read_bytes(s, &data);
    else                          read_bytes(s, &data);
    return data;
}
template <class T>
T try_read_bytes(std::istream &s=std::cin) { return read_bytes<T, throwing>(s); }



#endif