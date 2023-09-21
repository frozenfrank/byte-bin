#include "WaveOrthotope.hpp"

int main() {
	// Create WaveOrthotope
	auto m = 25, n = 50;
	auto c = 0.01;
	auto w = WaveOrthotope(m, n, c);
	
	// Set interior cells of v to 0.1
	for (int i = 1; i < m - 1; i++){
		for (int j = 1; j < n - 1; j++){
			w.v(i, j) = 0.1;
		}	
	}
	
	// Solve and print result
	std::cout << w.solve() << std::endl;
	return 0;
}
