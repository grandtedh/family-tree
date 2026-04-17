#include <stdio.h>
#include <cstring>
#include <unordered_map>
#include <set>

// Implementation is based on "Relatedness coefficients in pedigrees with inbred founders" by Magnus Dehli Vigeland

typedef unsigned short Person;

// This is the solution to a linear system of equations relating generalized kinship coefficients and Jacquard coefficients
// Values are copied from ribd implementation
constexpr double M_inv[9][9] = {
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

enum PARENT : unsigned char {
  FATHER = 0,
  MOTHER = 1,
};

std::unordered_map<long, double> phiCache;
std::unordered_map<long long, double> phi3Cache;
std::unordered_map<long long, double> phi22Cache;
std::unordered_map<long long, double> phi4Cache;

Person (*tree)[2];
std::unordered_map<Person, std::set<Person>> ancestors;


void getAncestors(Person length) {
  for (Person i = 1; i < length; i++) {
    ancestors.emplace(i, std::set<Person>{});
    Person father = tree[i][FATHER];
    Person mother = tree[i][MOTHER];
    ancestors[i].insert(father);
    ancestors[i].insert(mother);
    ancestors[i].insert(ancestors[father].begin(), ancestors[father].end());
    ancestors[i].insert(ancestors[mother].begin(), ancestors[mother].end());
  }
}

double phi(Person a, Person b) {
  long oldest = a < b ? a : b;
  long youngest = a < b ? b : a;
  // Use sorted order as canonical to improve cache hit rate
  long cacheKey = (oldest << 16) + youngest;
  if (phiCache.count(cacheKey) == 1) {
    return phiCache[cacheKey];
  }
  double result;
  if (tree[a][FATHER] == 0) {
    // a is a founder
    if (tree[b][FATHER] != 0) {
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
        result = 0.5 + phi(tree[a][FATHER], tree[a][MOTHER]) / 2.0;
      } else {
        result = (phi(tree[a][FATHER], b) + phi(tree[a][MOTHER], b)) / 2.0;
      }
    }
  }

  // printf("phi: %hu, %hu -> %lf\n", a, b, result);

  phiCache[cacheKey] = result;
  return result;
}

double phi3(Person a, Person b, Person c) {
  long long oldest = (a < b) ? ((a < c) ? a : c) : ((b < c) ? b : c);
  long long youngest = (a > b) ? ((a > c) ? a : c) : ((b > c) ? b : c);
  long long middle = a + b + c - oldest - youngest;
  long long cacheKey = (oldest << 32) + (middle << 16) + youngest;
  if (phi3Cache.count(cacheKey) == 1) {
    return phi3Cache[cacheKey];
  }
  double result;
  if (tree[a][FATHER] == 0) {
    // a is a founder
    if (tree[b][FATHER] != 0) {
      // a is a founder and b is not
      result = phi3(b, a, c);
    } else if (tree[c][FATHER] != 0) {
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
        result = (1 + 3.0 * phi(tree[a][FATHER], tree[a][MOTHER])) / 4.0;
      } else if (a == b) {
        result = (phi(a, c) + phi3(tree[a][FATHER], tree[a][MOTHER], c)) / 2.0;
      } else if (a == c) {
        result = (phi(a, b) + phi3(tree[a][FATHER], tree[a][MOTHER], b)) / 2.0;
      } else {
        result = (phi3(tree[a][FATHER], b, c) + phi3(tree[a][MOTHER], b, c)) / 2.0;
      }
    }
  }

  // printf("phi3: %hu, %hu, %hu -> %lf\n", a, b, c, result);

  phi3Cache[cacheKey] = result;
  return result;
}

double phi4(Person a, Person b, Person c, Person d) {
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

  if (tree[a][FATHER] == 0) {
    // a is a founder
    if (tree[b][FATHER] != 0) {
      // a is a founder and b is not
      result = phi4(b, a, c, d);
    } else if (tree[c][FATHER] != 0) {
      // a and b both founders, c is not
      result = phi4(c, a, b, d);
    } else if (tree[d][FATHER] != 0) {
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
        result = (1 + 7.0 * phi(tree[a][FATHER], tree[a][MOTHER])) / 8.0;
      } else if (a == b && b == c) {
        result = (phi(a, d) + 3.0 * phi3(tree[a][FATHER], tree[a][MOTHER], d)) / 4.0;
      } else if (a == b && b == d) {
        result = (phi(a, c) + 3.0 * phi3(tree[a][FATHER], tree[a][MOTHER], c)) / 4.0;
      } else if (a == c && c == d) {
        result = (phi(a, b) + 3.0 * phi3(tree[a][FATHER], tree[a][MOTHER], b)) / 4.0;
      } else if (a == b) {
        result = (phi3(a, c, d) + phi4(tree[a][FATHER], tree[a][MOTHER], c, d)) / 2.0;
      } else if (a == c) {
        result = (phi3(a, b, d) + phi4(tree[a][FATHER], tree[a][MOTHER], b, d)) / 2.0;
      } else if (a == d) {
        result = (phi3(a, b, c) + phi4(tree[a][FATHER], tree[a][MOTHER], b, c)) / 2.0;
      } else {
        result = (phi4(tree[a][FATHER], b, c, d) + phi4(tree[a][MOTHER], b, c, d)) / 2.0;
      }
    }
  }

  // printf("phi4: %hu, %hu, %hu, %hu -> %lf\n", a, b, c, d, result);

  phi4Cache[cacheKey] = result;
  return result;
}

double phi22(Person a, Person b, Person c, Person d) {
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

  if (tree[a][FATHER] == 0) {
    // a is a founder
    if (tree[b][FATHER] != 0) {
      // a is a founder and b is not
      result = phi22(b, a, c, d);
    } else if (tree[c][FATHER] != 0) {
      // a and b both founders, c is not
      result = phi22(c, d, a, b);
    } else if (tree[d][FATHER] != 0) {
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
        result = (1 + 3.0 * phi(tree[a][FATHER], tree[a][MOTHER])) / 4.0;
      } else if (a == b && b == c) {
        result = (phi(a, d) + phi3(tree[a][FATHER], tree[a][MOTHER], d)) / 2.0;
      } else if (a == b && b == d) {
        result = (phi(a, c) + phi3(tree[a][FATHER], tree[a][MOTHER], c)) / 2.0;
      } else if (a == c && c == d) {
        result = (phi(a, b) + phi3(tree[a][FATHER], tree[a][MOTHER], b)) / 2.0;
      } else if (a == b) {
        result = (phi(c, d) + phi22(tree[a][FATHER], tree[a][MOTHER], c, d)) / 2.0;
      } else if (a == c) {
        result = (2.0 * phi3(a, b, d) + phi22(tree[a][FATHER], b, tree[a][MOTHER], d) + phi22(tree[a][MOTHER], b, tree[a][FATHER], d)) / 4.0;
      } else if (a == d) {
        result = (2.0 * phi3(a, b, c) + phi22(tree[a][FATHER], b, tree[a][MOTHER], c) + phi22(tree[a][MOTHER], b, tree[a][FATHER], c)) / 4.0;
      } else {
        result = (phi22(tree[a][FATHER], b, c, d) + phi22(tree[a][MOTHER], b, c, d)) / 2.0;
      }
    }
  }

  // printf("phi22: %hu, %hu, %hu, %hu -> %lf\n", a, b, c, d, result);

  phi22Cache[cacheKey] = result;
  return result;
}

int initialize(Person* treeInput, Person length) {
  tree = new Person [length][2];
  std::memcpy(tree, treeInput, length * 2 * sizeof(Person));
  for (Person i = 1; i < length; i++) {
    if ((tree[i][FATHER] == 0 && tree[i][MOTHER] != 0) || (tree[i][FATHER] != 0 && tree[i][MOTHER] == 0)) {
      // To simplify algorithm implementation, we insist that all individuals in the tree must be founders or else have both parents
      delete[] tree;
      return 1;
    }
    if (tree[i][FATHER] == i || tree[i][MOTHER] == i) {
      // The family tree must be acyclic for the algorithm to terminate
      // Full cyclicity checking would be a bit complicated, so for simplicity we just check for self-parentage
      // Should be enough to catch simple off-by-one errors
      delete [] tree;
      return 2;
    }
  }
  getAncestors(length);
  return 0;
}

double* getJacquardCoefficients(Person a, Person b) {
  const double rhs[9] = {
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
  return coefs;
}

extern "C" {

  int init(Person* treeInput, Person length) {
    return initialize(treeInput, length);
  }

  double* jacquard(Person a, Person b) {
    return getJacquardCoefficients(a, b);
  }

}