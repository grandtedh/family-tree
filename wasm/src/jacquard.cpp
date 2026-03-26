#include <stdio.h>
#include <cstring>
#include <unordered_map>

double* getJacquardCoefficients(short* treeInput, short length) {
  short (*tree)[2] = new short [length][2];
  std::memcpy(tree, treeInput, length * 2 * sizeof(short));
  double *result = new double[9] {
    static_cast<double>(1),
    static_cast<double>(2),
    static_cast<double>(3),
    static_cast<double>(4),
    static_cast<double>(tree[2][0]),
    static_cast<double>(tree[2][1]),
    static_cast<double>(tree[3][0]),
    static_cast<double>(tree[3][1]),
    static_cast<double>(tree[4][0]),
  };
  delete[] tree;
  return result;
}

extern "C" {

  double* jacquard(short* treeInput, short length) {
    return getJacquardCoefficients(treeInput, length);
  }

}