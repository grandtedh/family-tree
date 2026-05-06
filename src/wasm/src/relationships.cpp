#include <stdio.h>
#include <cstring>
#include <unordered_map>
#include <vector>
#include <stack>
#include <unordered_set>
#include <list>
#include <type_traits>
#include <limits>

/** Numerical ID for an individual
 *  Valid range is 1..32767. 0 represents invalid/out-of-tree
 */ 
using Person = int16_t;
/** Difference in generations for a relationship path between two individuals
 *  Valid range is -32766..32766 (cannot be more generations than individuals)
 */
using GenerationDelta = std::make_signed_t<Person>;
/** Degree of cousinship (horizontal distance) between two individuals
 *  Valid range is 0..16383 (max cousinship requires two lines of equal length)
 */
using CousinhoodDegree = std::make_unsigned_t<Person>;
/** Large enough for a bit-concatenated GenerationDelta and CousinhoodDegree
 *  Used as a key for std::unordered_maps with relationship properties as keys
 */
using RelationshipKey = uint32_t;
static_assert(
  std::numeric_limits<std::make_unsigned_t<GenerationDelta>>::digits
  + std::numeric_limits<std::make_unsigned_t<CousinhoodDegree>>::digits
  <= std::numeric_limits<RelationshipKey>::digits);

enum PARENT : uint8_t {
  FATHER = 0,
  MOTHER = 1,
};

struct Parentage {
  Person leftFather;
  Person leftMother;
  Person rightFather;
  Person rightMother;
};

struct Relationship {
  // Degree of removal
  // Positive sign means `left` is from an earlier generation than `right`
  GenerationDelta removal;
  // Degree of cousinhood
  // 0 is lineal ancestry/descent
  CousinhoodDegree cousinhood;
  // All the sets of common ancestry linking `left` and `right`
  Parentage *parentages;
  size_t parentage_length;
};

struct CppRelationship {
  // Degree of removal
  // Positive sign means `left` is from an earlier generation than `right`
  GenerationDelta removal;
  // Degree of cousinhood
  // 0 is lineal ancestry/descent
  CousinhoodDegree cousinhood;
  // All the sets of common ancestry linking `left` and `right`
  std::vector<Parentage> parentage;
};

struct Ancestry {
  Person person;
  PARENT type;
  Ancestry *child;
};

struct RelationshipPath {
  Person ancestor;
  Ancestry *left;
  Ancestry *right;
};

Person (*tree)[2];
std::unordered_map<Person, std::unordered_map<Person, std::vector<Ancestry*>>> ancestries;

void getAncestries(Person root) {
  if (ancestries.count(root) == 1) {
    // Ancestor paths already cached
    return;
  }
  ancestries.emplace(root, std::unordered_map<Person, std::vector<Ancestry*>>{});
  std::unordered_map<Person, std::vector<Ancestry*>>* rootAncestries = &(ancestries[root]);
  std::stack<Ancestry*> ancestriesToTrace;
  ancestriesToTrace.push(new Ancestry{root, FATHER, nullptr});
  while (!ancestriesToTrace.empty()) {
    Ancestry *ancestry = ancestriesToTrace.top();
    ancestriesToTrace.pop();
    if (rootAncestries->count(ancestry->person) == 0) {
      rootAncestries->emplace(ancestry->person, std::vector<Ancestry*>{});
    }
    (*rootAncestries)[ancestry->person].push_back(ancestry);
    if (tree[ancestry->person][FATHER] != 0) {
      ancestriesToTrace.push(new Ancestry{tree[ancestry->person][FATHER], FATHER, ancestry});
    }
    if (tree[ancestry->person][MOTHER] != 0) {
      ancestriesToTrace.push(new Ancestry{tree[ancestry->person][MOTHER], MOTHER, ancestry});
    }
  }
}

void getCommonAncestors(Person a, Person b, std::vector<Person> &commonAncestors) {
  std::unordered_map<Person, std::vector<Ancestry*>> *smallerMap, *largerMap;
  if (ancestries[a].size() < ancestries[b].size()) {
    smallerMap = &ancestries[a];
    largerMap = &ancestries[b];
  } else {
    smallerMap = &ancestries[b];
    largerMap = &ancestries[a];
  }
  for (auto iter = smallerMap->begin(); iter != smallerMap->end(); iter++) {
    if (largerMap->count(iter->first) == 1) {
      commonAncestors.push_back(iter->first);
    }
  }
}

void getRelationshipPaths(Person a, Person b, std::vector<Person> &commonAncestors, std::list<RelationshipPath> &relationshipPaths) {
  for (auto commonAncestor = commonAncestors.begin(); commonAncestor != commonAncestors.end(); commonAncestor++) {
    std::vector<Ancestry*> *leftPaths = &ancestries[a][*commonAncestor];
    std::vector<Ancestry*> *rightPaths = &ancestries[b][*commonAncestor];
    for (auto leftPath = leftPaths->begin(); leftPath != leftPaths->end(); leftPath++) {
      for (auto rightPath = rightPaths->begin(); rightPath != rightPaths->end(); rightPath++) {
        std::unordered_set<Person> leftAncestors;
        for (Ancestry *leftPtr = (*leftPath); leftPtr->child != nullptr; leftPtr = leftPtr->child) {
          leftAncestors.insert(leftPtr->child->person);
        }
        bool repeatedAncestor = false;
        for (Ancestry *rightPtr = (*rightPath); rightPtr != nullptr; rightPtr = rightPtr->child) {
          if (leftAncestors.count(rightPtr->person) == 1) {
            repeatedAncestor = true;
            break;
          }
        }
        if (repeatedAncestor) {
          continue;
        }
        relationshipPaths.push_back(RelationshipPath{*commonAncestor, *leftPath, *rightPath});
      }
    }
  }
}

void classifyRelationships(std::list<RelationshipPath> &relationshipPaths, std::unordered_map<long, CppRelationship> &relationships) {
  while (!relationshipPaths.empty()) {
    std::vector<RelationshipPath> groupedRelationships;
    groupedRelationships.push_back(relationshipPaths.back());
    relationshipPaths.pop_back();
    for (auto iter = relationshipPaths.begin(); iter != relationshipPaths.end();) {
      if (groupedRelationships.back().left->child == iter->left->child && groupedRelationships.back().right->child == iter->right->child) {
        groupedRelationships.push_back(*iter);
        iter = relationshipPaths.erase(iter);
      } else {
        iter++;
      }
    }
    Parentage parentage = {0, 0, 0, 0};
    for (auto iter = groupedRelationships.begin(); iter != groupedRelationships.end(); iter++) {
      if (iter->left->child != nullptr) {
        if (iter->left->type == FATHER) {
          parentage.leftFather = iter->ancestor;
        } else {
          parentage.leftMother = iter->ancestor;
        }
      }
      if (iter->right->child != nullptr) {
        if (iter->right->type == FATHER) {
          parentage.rightFather = iter->ancestor;
        } else {
          parentage.rightMother = iter->ancestor;
        }
      }
    }
    long leftHeight = 0;
    for (Ancestry *leftPtr = groupedRelationships[0].left; leftPtr != nullptr; leftPtr = leftPtr->child) {
      leftHeight++;
    }
    long rightHeight = 0;
    for (Ancestry *rightPtr = groupedRelationships[0].right; rightPtr != nullptr; rightPtr = rightPtr->child) {
      rightHeight++;
    }
    GenerationDelta removal = rightHeight - leftHeight;
    CousinhoodDegree cousinhood = (leftHeight < rightHeight ? leftHeight : rightHeight) - 1;
    RelationshipKey relationshipKey =
      (static_cast<RelationshipKey>(removal) << std::numeric_limits<std::make_unsigned_t<CousinhoodDegree>>::digits)
      + static_cast<RelationshipKey>(cousinhood);
    if (relationships.count(relationshipKey) == 1) {
      relationships[relationshipKey].parentage.push_back(parentage);
    } else {
      relationships[relationshipKey] = CppRelationship{removal, cousinhood, std::vector<Parentage>(1, parentage)};
    }
  }
}

Relationship *contiguizeRelationships(std::unordered_map<long, CppRelationship> &relationships, size_t *outLength) {
  Relationship *outRelationships = static_cast<Relationship *>(malloc(relationships.size() * sizeof(Relationship)));
  int i = 0;
  for (auto iter = relationships.begin(); iter != relationships.end(); iter++) {
    size_t parentageLength = iter->second.parentage.size();
    Parentage *parentages = static_cast<Parentage *>(malloc(parentageLength * sizeof(Parentage)));
    memcpy(parentages, &iter->second.parentage[0], parentageLength * sizeof(Parentage));
    outRelationships[i] = Relationship {iter->second.removal, iter->second.cousinhood, parentages, parentageLength};
    i++;
  }
  *outLength = relationships.size();
  return outRelationships;
}

void initialize(Person* treeInput, Person length) {
  tree = new Person [length][2];
  std::memcpy(tree, treeInput, length * 2 * sizeof(Person));
}

Relationship *getRelationships(Person a, Person b, size_t *outLength) {
  getAncestries(a);
  getAncestries(b);
  std::vector<Person> commonAncestors;
  getCommonAncestors(a, b, commonAncestors);
  std::list<RelationshipPath> relationshipPaths;
  getRelationshipPaths(a, b, commonAncestors, relationshipPaths);
  std::unordered_map<long, CppRelationship> relationships;
  classifyRelationships(relationshipPaths, relationships);
  Relationship *outRelationships = contiguizeRelationships(relationships, outLength);
  return outRelationships;
}

extern "C" {

  void init(Person *treeInput, Person length) {
    initialize(treeInput, length);
  }

  Relationship* get_relationships(Person a, Person b, size_t *out_length) {
    return getRelationships(a, b, out_length);
  }

  size_t get_relationship_size() {
    return sizeof(Relationship);
  }

  size_t get_parentage_size() {
    return sizeof(Parentage);
  }

  size_t get_removal_offset() {
    return offsetof(Relationship, removal);
  }

  size_t get_cousinhood_offset() {
    return offsetof(Relationship, cousinhood);
  }

  size_t get_parentages_offset() {
    return offsetof(Relationship, parentages);
  }

  size_t get_parentage_length_offset() {
    return offsetof(Relationship, parentage_length);
  }

  size_t get_left_father_offset() {
    return offsetof(Parentage, leftFather);
  }

  size_t get_left_mother_offset() {
    return offsetof(Parentage, leftMother);
  }

  size_t get_right_father_offset() {
    return offsetof(Parentage, rightFather);
  }

  size_t get_right_mother_offset() {
    return offsetof(Parentage, rightMother);
  }

}