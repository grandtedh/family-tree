#include <stdio.h>
#include <cstring>
#include <unordered_map>
#include <vector>
#include <stack>
#include <unordered_set>
#include <list>

typedef unsigned short Person;

enum PARENT : unsigned char {
  FATHER = 0,
  MOTHER = 1,
};

enum Completeness : unsigned char {
  HALF = 0,
  FULL = 1,
};

enum Parentage : unsigned char {
  ALLOGAMOUS = 0,
  ALLOGAMOUS_CROSS = 1,
  AUTOGAMOUS = 2,
  PARENTAGE_FATHER = 3,
  PARENTAGE_MOTHER = 4,
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

struct Relationship {
  // Magnitude of removal can't be greater than number of people
  long removal;
  // Cousinship can't be greater than number of people
  unsigned short cousinship;
  Completeness completeness;
  Parentage parentage;
  unsigned long long multiplicity;
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

void classifyRelationships(std::list<RelationshipPath> &relationshipPaths, std::unordered_map<long long, Relationship> &relationships) {
  int i = 0;
  while (!relationshipPaths.empty()) {
    RelationshipPath relationshipPath = relationshipPaths.back();
    relationshipPaths.pop_back();
    bool hasAutogamousPair = false;
    bool hasPartnerPair = false;
    for (auto iter = relationshipPaths.begin(); iter != relationshipPaths.end();) {
      bool erase = false;
      if (relationshipPath.left->child == iter->left->child && relationshipPath.right->child == iter->right->child) {
        if (relationshipPath.left->child != nullptr && relationshipPath.right->child != nullptr) {
          // Non-lineal ancestry, determine sibling type at the root
          if (relationshipPath.left->type == iter->left->type || relationshipPath.right->type == iter->right->type) {
            hasAutogamousPair = true;
            erase = true;
          } else {
            // Full siblings
            hasPartnerPair = true;
            erase = true;
          }
        } else if (relationshipPath.right->child == nullptr) {
          // Left is a lineal descendant of right
          // Can only be autogamy
          hasAutogamousPair = true;
          erase = true;
        }
        // If left is a lineal ancestor of right, don't collapse relationships based on autogamy
        // If self-relationship, should be no other relationships
      }
      if (erase) {
        iter = relationshipPaths.erase(iter);
      } else {
        iter++;
      }
    }
    Relationship relationship;
    relationship.multiplicity = 1;
    if (hasAutogamousPair) {
      relationship.parentage = AUTOGAMOUS;
    } else {
      if (relationshipPath.left->child == nullptr) {
        relationship.parentage = relationshipPath.right->type == FATHER ? PARENTAGE_FATHER : PARENTAGE_MOTHER;
      } else if (relationshipPath.right->child != nullptr && relationshipPath.left->type != relationshipPath.right->type) {
        relationship.parentage = ALLOGAMOUS_CROSS;
      } else  {
        relationship.parentage = ALLOGAMOUS;
      }
    }
    relationship.completeness = hasPartnerPair ? FULL : HALF;
    long leftHeight = 0;
    for (Ancestry *leftPtr = relationshipPath.left; leftPtr != nullptr; leftPtr = leftPtr->child) {
      leftHeight++;
    }
    long rightHeight = 0;
    for (Ancestry *rightPtr = relationshipPath.right; rightPtr != nullptr; rightPtr = rightPtr->child) {
      rightHeight++;
    }
    relationship.removal = rightHeight - leftHeight;
    relationship.cousinship = (leftHeight < rightHeight ? leftHeight : rightHeight) - 1;
    long long relationshipKey =
      (static_cast<long long>(relationship.removal) << 32)
      + (static_cast<long>(relationship.cousinship) << 16)
      + (static_cast<unsigned short>(relationship.completeness) << 8)
      + relationship.parentage;
    if (relationships.count(relationshipKey) == 1) {
      relationships[relationshipKey].multiplicity++;
    } else {
      relationships[relationshipKey] = relationship;
    }
  }
}

size_t contiguizeRelationships(Relationship **outRelationships, std::unordered_map<long long, Relationship> &relationships) {
  (*outRelationships) = static_cast<Relationship *>(malloc(relationships.size() * sizeof(Relationship)));
  int i = 0;
  for (auto iter = relationships.begin(); iter != relationships.end(); iter++) {
    if (i == 0) {
    }
    (*outRelationships)[i] = iter->second;
    i++;
  }
  return relationships.size();
}

void initialize(Person* treeInput, Person length) {
  tree = new Person [length][2];
  std::memcpy(tree, treeInput, length * 2 * sizeof(Person));
}

int getRelationships(Person a, Person b, Relationship **outRelationships) {
  getAncestries(a);
  getAncestries(b);
  std::vector<Person> commonAncestors;
  getCommonAncestors(a, b, commonAncestors);
  std::list<RelationshipPath> relationshipPaths;
  getRelationshipPaths(a, b, commonAncestors, relationshipPaths);
  std::unordered_map<long long, Relationship> relationships;
  classifyRelationships(relationshipPaths, relationships);
  size_t numRelationships = contiguizeRelationships(outRelationships, relationships);
  return numRelationships;
}

extern "C" {

  void init(Person *treeInput, Person length) {
    initialize(treeInput, length);
  }

  size_t relationships(Person a, Person b, Relationship **relationships) {
    return getRelationships(a, b, relationships);
  }

  size_t get_relationship_size() {
    return sizeof(Relationship);
  }

  size_t get_removal_offset() {
    return offsetof(Relationship, removal);
  }

  size_t get_cousinship_offset() {
    return offsetof(Relationship, cousinship);
  }

  size_t get_completeness_offset() {
    return offsetof(Relationship, completeness);
  }

  size_t get_parentage_offset() {
    return offsetof(Relationship, parentage);
  }

  size_t get_multiplicity_offset() {
    return offsetof(Relationship, multiplicity);
  }

}