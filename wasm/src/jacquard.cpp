#include <stdio.h>
#include <cstring>
#include <unordered_map>
#include <set>

// Implementation is based on "Relatedness coefficients in pedigrees with inbred founders" by Magnus Dehli Vigeland

typedef unsigned short person;

// This is the solution to a linear system of equations relating generalized kinship coefficients and Jacquard coefficients
// Values are copied from ribd implementation
double M_inv[9][9] = {
  { 0, 0, 0, 0.25,-0.25,-0.25, 0.25, 0,   0,},
  { 1,-1,-1,-0.25, 0.25, 0.25,-0.25, 1,   0,},
  { 0, 0, 0,   -1,    1,  0.5, -0.5, 0,   0,},
  {-2, 2, 1,    1,   -1, -0.5,  0.5,-1,   0,},
  { 0, 0, 0,   -1,  0.5,    1, -0.5, 0,   0,},
  {-2, 1, 2,    1, -0.5,   -1,  0.5,-1,   0,},
  { 0, 0, 0,    0,    0,    0, -0.5, 0, 0.5,},
  { 0, 0, 0,    4,   -2,   -2,    2, 0,-1.0,},
  { 4,-2,-2,   -4,    2,    2, -1.5, 1, 0.5,},
};

std::unordered_map<long, double> phiCache;
std::unordered_map<long long, double> phi3Cache;
std::unordered_map<long long, double> phi22Cache;
std::unordered_map<long long, double> phi4Cache;

person (*tree)[2];
std::unordered_map<person, std::set<person>> ancestors;


void getAncestors(person (*tree)[2], person length, std::unordered_map<person, std::set<person>> &ancestors) {
  for (person i = 1; i < length; i++) {
    ancestors.emplace(i, std::set<person>{});
    person father = tree[i][0];
    person mother = tree[i][1];
    ancestors[i].insert(father);
    ancestors[i].insert(mother);
    ancestors[i].insert(ancestors[father].begin(), ancestors[father].end());
    ancestors[i].insert(ancestors[mother].begin(), ancestors[mother].end());
  }
}

double phi(person a, person b) {
  long oldest = a < b ? a : b;
  long youngest = a < b ? b : a;
  // Use sorted order as canonical to improve cache hit rate
  long cacheKey = (oldest << 16) + youngest;
  if (phiCache.count(cacheKey) == 1) {
    return phiCache[cacheKey];
  }
  double result;
  if (tree[a][0] == 0) {
    // a is a founder
    if (tree[b][0] != 0) {
      // a is a founder and b is not
      result = phi(b, a);
    } else if (a == b) {
      // Self-kinship
      result = 0.5;
    } else {
      // Distinct founders (unrelated)
      result = 0.0;
    }
  } else {
    // a is a nonfounder
    if (ancestors[b].count(a) > 0) {
      // b is a descendant of a
      result = phi(b, a);
    } else {
      // a is a nonfounder and b is a nondescendant of a
      // Recurrence relations apply (see Vigeland)
      if (a == b) {
        result = 0.5 + phi(tree[a][0], tree[a][1]) / 2.0;
      } else {
        result = (phi(tree[a][0], b) + phi(tree[a][1], b)) / 2.0;
      }
    }
  }
  phiCache[cacheKey] = result;
  return result;
}

double phi3(person a, person b, person c) {
  long long oldest = (a < b) ? ((a < c) ? a : c) : ((b < c) ? b : c);
  long long youngest = (a > b) ? ((a > c) ? a : c) : ((b > c) ? b : c);
  long long middle = a + b + c - oldest - youngest;
  long long cacheKey = (oldest << 32) + (middle << 16) + youngest;
  if (phi3Cache.count(cacheKey) == 1) {
    return phi3Cache[cacheKey];
  }
  double result;
  if (tree[a][0] == 0) {
    // a is a founder
    if (tree[b][0] != 0) {
      // a is a founder and b is not
      result = phi3(b, a, c);
    } else if (tree[c][0] != 0) {
      // a and b both founders, c is not
      result = phi3(c, a, b);
    } else if (a == b && b == c) {
      // Self-kinship
      result = 0.25;
    } else {
      // At least two out of three are distinct founders (unrelated)
      result = 0.0;
    }
  } else {
    // a is a nonfounder
    if (ancestors[b].count(a) > 0) {
      // b is a descendant of a
      result = phi3(b, a, c);
    } else if (ancestors[c].count(a) > 0) {
      // c is a descendant of a
      result = phi3(c, a, b);
    } else {
      // a is a nonfounder and b, c are nondescendants of a
      // Recurrence relations apply (see Vigeland)
      if (a == b && b == c) {
        result = (1 + 3.0 * phi(tree[a][0], tree[a][1])) / 4.0;
      } else if (a == b) {
        result = (phi(a, c) + phi3(tree[a][0], tree[a][1], c)) / 2.0;
      } else if (a == c) {
        result = (phi(a, b) + phi3(tree[a][0], tree[a][1], b)) / 2.0;
      } else {
        result = (phi3(tree[a][0], b, c) + phi3(tree[a][1], b, c)) / 2.0;
      }
    }
  }

  phi3Cache[cacheKey] = result;
  return result;
}

double phi4(person a, person b, person c, person d) {
  long long oldest = a, secondOldest = b, secondYoungest = c, youngest = d;
  if (oldest > secondOldest) std::swap(oldest, secondOldest);
  if (secondYoungest > youngest) std::swap(secondYoungest, youngest);
  if (oldest > secondYoungest) std::swap(oldest, secondYoungest);
  if (secondOldest > youngest) std::swap(secondOldest, youngest);
  if (secondOldest > secondYoungest) std::swap(secondOldest, secondYoungest);

  long long cacheKey = (oldest << 48) + (secondOldest << 32) + (secondYoungest << 16) + youngest;

  if (phi4Cache.count(cacheKey) == 1) {
    return phi4Cache[cacheKey];
  }
  double result;

  if (tree[a][0] == 0) {
    // a is a founder
    if (tree[b][0] != 0) {
      // a is a founder and b is not
      result = phi4(b, a, c, d);
    } else if (tree[c][0] != 0) {
      // a and b both founders, c is not
      result = phi4(c, a, b, d);
    } else if (tree[d][0] != 0) {
      // a, b, c all founders, d is not
      result = phi4(d, a, b, c);
    } else if (a == b && b == c && c == d) {
      // Self-kinship
      result = 0.125;
    } else {
      // At least two out of four are distinct founders (unrelated)
      result = 0.0;
    }
  } else {
    // a is a nonfounder
    if (ancestors[b].count(a) > 0) {
      // b is a descendant of a
      result = phi4(b, a, c, d);
    } else if (ancestors[c].count(a) > 0) {
      // c is a descendant of a
      result = phi4(c, a, b, d);
    } else if (ancestors[d].count(a) > 0) {
      // d is a descendant of a
      result = phi4(d, a, b, c);
    } else {
      // a is a nonfounder and b, c, d are nondescendants of a
      // Recurrence relations apply (see Vigeland)
      if (a == b && b == c && c == d) {
        result = (1 + 7.0 * phi(tree[a][0], tree[a][1])) / 8.0;
      } else if (a == b && b == c) {
        result = (phi(a, d) + 3.0 * phi3(tree[a][0], tree[a][1], d)) / 4.0;
      } else if (a == b && b == d) {
        result = (phi(a, c) + 3.0 * phi3(tree[a][0], tree[a][1], c)) / 4.0;
      } else if (a == c && c == d) {
        result = (phi(a, b) + 3.0 * phi3(tree[a][0], tree[a][1], b)) / 4.0;
      } else if (a == b) {
        result = (phi3(a, c, d) + phi4(tree[a][0], tree[a][1], c, d)) / 2.0;
      } else if (a == c) {
        result = (phi3(a, b, d) + phi4(tree[a][0], tree[a][1], b, d)) / 2.0;
      } else if (a == d) {
        result = (phi3(a, b, c) + phi4(tree[a][0], tree[a][1], b, c)) / 2.0;
      } else {
        result = (phi4(tree[a][0], b, c, d) + phi4(tree[a][1], b, c, d)) / 2.0;
      }
    }
  }

  phi4Cache[cacheKey] = result;
  return result;
}

double phi22(person a, person b, person c, person d) {
  long long oldest1 = a < b ? a : b;
  long long youngest1 = a < b ? b : a;
  long long oldest2 = c < d ? c : d;
  long long youngest2 = c < d ? d : c;
  if (oldest1 > oldest2) {
    std::swap(oldest1, oldest2);
    std::swap(youngest1, youngest2);
  }

  long long cacheKey = (oldest1 << 48) + (youngest1 << 32) + (oldest2 << 16) + youngest2;

  if (phi22Cache.count(cacheKey) == 1) {
    return phi22Cache[cacheKey];
  }
  double result;

  if (tree[a][0] == 0) {
    // a is a founder
    if (tree[b][0] != 0) {
      // a is a founder and b is not
      result = phi22(b, a, c, d);
    } else if (tree[c][0] != 0) {
      // a and b both founders, c is not
      result = phi22(c, d, a, b);
    } else if (tree[d][0] != 0) {
      // a, b, c all founders, d is not
      result = phi22(d, c, a, b);
    } else if (a == b && c == d) {
      // Self-kinship or two independent founders
      result = 0.25;
    } else {
      // At least one pair is distinct founders (unrelated)
      result = 0;
    }
  } else {
    // a is a nonfounder
    if (ancestors[b].count(a) > 0) {
      // b is a descendant of a
      result = phi22(b, a, c, d);
    } else if (ancestors[c].count(a) > 0) {
      // c is a descendant of a
      result = phi22(c, d, a, b);
    } else if (ancestors[d].count(a) > 0) {
      // d is a descendant of a
      result = phi22(d, c, a, b);
    } else {
      // a is a nonfounder and b, c, d are nondescendants of a
      // Recurrence relations apply (see Vigeland)
      if (a == b && b == c && c == d) {
        result = (1 + 3.0 * phi(tree[a][0], tree[a][1])) / 4.0;
      } else if (a == b && b == c) {
        result = (phi(a, d) + phi3(tree[a][0], tree[a][1], d)) / 2.0;
      } else if (a == b && b == d) {
        result = (phi(a, c) + phi3(tree[a][0], tree[a][1], c)) / 2.0;
      } else if (a == c && c == d) {
        result = (phi(a, b) + phi3(tree[a][0], tree[a][1], b)) / 2.0;
      } else if (a == b) {
        result = (phi(c, d) + phi22(tree[a][0], tree[a][1], c, d)) / 2.0;
      } else if (a == c) {
        result = (2.0 * phi3(a, b, d) + phi22(tree[a][0], b, tree[a][1], d) + phi22(tree[a][1], b, tree[a][0], d)) / 4.0;
      } else if (a == d) {
        result = (2.0 * phi3(a, b, c) + phi22(tree[a][0], b, tree[a][1], c) + phi22(tree[a][1], b, tree[a][0], c)) / 4.0;
      } else {
        result = (phi22(tree[a][0], b, c, d) + phi22(tree[a][1], b, c, d)) / 2.0;
      }
    }
  }

  phi22Cache[cacheKey] = result;
  return result;
}

double* getJacquardCoefficients(person a, person b, person* treeInput, person length) {
  tree = new person [length][2];
  std::memcpy(tree, treeInput, length * 2 * sizeof(person));
  getAncestors(tree, length, ancestors);
  double rhs[9] = {
    1,
    2 * phi(a, a),
    2 * phi(b, b),
    4 * phi(a, b),
    8 * phi3(a, a, b),
    8 * phi3(a, b, b),
    16 * phi4(a, a, b, b),
    4 * phi22(a, a, b, b),
    16 * phi22(a, b, a, b),
  };
  double *coefs = new double[9];
  for (int i = 0; i < 9; i++) {
    double sum = 0.0;
    for (int j = 0; j < 9; j++) {
      sum += M_inv[i][j] * rhs[j];
    }
    coefs[i] = sum;
  }
  // double *coefs = new double[9] {0, phi(a, a), phi(b, b), phi(a, b), phi3(a, a, b), phi3(a, b, b), phi4(a, a, b, b), phi22(a, a, b, b), phi22(a, b, a, b)};
  delete[] tree;
  return coefs;
}

extern "C" {

  double* jacquard(person a, person b, person* treeInput, person length) {
    return getJacquardCoefficients(a, b, treeInput, length);
  }

}