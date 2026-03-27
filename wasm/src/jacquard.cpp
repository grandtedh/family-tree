#include <stdio.h>
#include <cstring>
#include <unordered_map>
#include <set>

typedef unsigned short person;

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

double phi(person a, person b, person (*tree)[2], std::unordered_map<person, std::set<person>> &ancestors, std::unordered_map<long, double> &cache) {
  long cacheKey = (a << 16) + b;
  if (cache.count(cacheKey) == 1) {
    return cache[cacheKey];
  }
  double result;
  if (a == b) {
    if (tree[a][0] == 0) {
      // Base case: outbred self-kinship
      result = 0.5;
    } else {
      // Self-kinship is related to inbreeding coefficient
      result = 0.5 + phi(tree[a][0], tree[a][1], tree, ancestors, cache) / 2;
    }
  } else if (ancestors[b].count(a) > 0) {
    // a is an ancestor of b, must recurse on b's parents
    result = (phi(a, tree[b][0], tree, ancestors, cache) + phi(a, tree[b][1], tree, ancestors, cache)) / 2.0;
  } else if (tree[a][0] != 0) {
    // a is not a founder
    result = (phi(tree[a][0], b, tree, ancestors, cache) + phi(tree[a][1], b, tree, ancestors, cache)) / 2.0;
  } else if (tree[b][0] != 0) {
    // b is not a founder
    result = (phi(a, tree[b][0], tree, ancestors, cache) + phi(a, tree[b][1], tree, ancestors, cache)) / 2.0;
  } else {
    // Base case: both founders, unrelated
    result = 0;
  }
  cache[cacheKey] = result;
  return result;
}

double phi3(person a, person b, person c, person (*tree)[2], std::unordered_map<person, std::set<person>> &ancestors, std::unordered_map<long long, double> &cache) {
  long cacheKey = (a << 32) + (b << 16) + c;
  if (cache.count(cacheKey) == 1) {
    return cache[cacheKey];
  }
  double result;
  
  result = 0.0;
  
  cache[cacheKey] = result;
  return result;
}

double* getJacquardCoefficients(person a, person b, person* treeInput, person length) {
  person (*tree)[2] = new person [length][2];
  std::memcpy(tree, treeInput, length * 2 * sizeof(person));
  std::unordered_map<long, double> phiCache;
  std::unordered_map<long long, double> phi3Cache;
  std::unordered_map<long long, double> phi22Cache;
  std::unordered_map<long long, double> phi4Cache;
  std::unordered_map<person, std::set<person>> ancestors;
  getAncestors(tree, length, ancestors);
  double phiResult = phi(a, b, tree, ancestors, phiCache);
  double phi3Result = phi3(a, b, a, tree, ancestors, phi3Cache);
  double* result = new double [9] {phiResult, 0, 0, 0, 0, 0, 0, 0, 0};
  delete[] tree;
  return result;
}

extern "C" {

  double* jacquard(person a, person b, person* treeInput, person length) {
    return getJacquardCoefficients(a, b, treeInput, length);
  }

}