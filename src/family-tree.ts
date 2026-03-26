interface Person {
  father?: string | number | undefined
  mother?: string | number | undefined
  gender: "m" | "f"
}

interface FamilyTree {
  [K: string | number]: Person
}

interface RelationshipNode {
  parent: string | number
  child: {
    type: "mother" | "father"
    relationship: RelationshipNode
  } | null
}

interface Ancestors {
  [K: string | number]: RelationshipNode[]
}

interface AncestorTree {
  [K: string | number]: Ancestors
}

interface Relationship {
  ancestor: string | number
  left: {
    type: "mother" | "father"
    child: RelationshipNode
  } | null
  right: {
    type: "mother" | "father"
    child: RelationshipNode
  } | null
}

export const familyTree: FamilyTree = {
  Mom: {
    gender: "f",
  },
  MaxFather: {
    gender: "m",
  },
  Ashley: {
    father: "MaxFather",
    mother: "Mom",
    gender: "f",
  },
  Max: {
    father: "MaxFather",
    mother: "Mom",
    gender: "m",
  },
  Amy: {
    father: "MaxFather",
    mother: "Mom",
    gender: "f",
  },
  Emmi: {
    father: "Max",
    mother: "Amy",
    gender: "f",
  },
  Stella: {
    father: "Max",
    mother: "Ashley",
    gender: "f",
  },
  Luna: {
    father: "Max",
    mother: "Ashley",
    gender: "f",
  },
  Annabelle: {
    father: "Max",
    mother: "Mom",
    gender: "f",
  },
} as const

export function getAncestorTree(familyTree: FamilyTree) {
  const ancestorTree: Partial<AncestorTree> = {}
  for (const name in familyTree) {
    const ancestors: Ancestors = {}
    ancestorTree[name] = ancestors
    const relationshipNodes: RelationshipNode[] = [
      { parent: name, child: null },
    ]
    while (relationshipNodes.length) {
      const relationshipNode = relationshipNodes.pop()!
      const ancestorRelationshipNodes = (ancestors[relationshipNode.parent] ??=
        [])
      ancestorRelationshipNodes.push(relationshipNode)
      const person = familyTree[relationshipNode.parent]!
      if (person.father !== undefined) {
        relationshipNodes.push({
          parent: person.father,
          child: {
            type: "father",
            relationship: relationshipNode,
          },
        })
      }
      if (person.mother !== undefined) {
        relationshipNodes.push({
          parent: person.mother,
          child: {
            type: "mother",
            relationship: relationshipNode,
          },
        })
      }
    }
  }
  return ancestorTree as AncestorTree
}

export function getRelationships(
  ancestorTree: AncestorTree,
  left: string | number,
  right: string | number,
) {
  const leftAncestors = new Set(Object.keys(ancestorTree[left] ?? {}))
  const rightAncestors = new Set(Object.keys(ancestorTree[right] ?? {}))
  const commonAncestors = new Set(
    [...leftAncestors].filter((x) => rightAncestors.has(x)),
  )
  const relationships: Relationship[] = []
  for (const name of commonAncestors) {
    const leftPaths = ancestorTree[left]![name]!
    const rightPaths = ancestorTree[right]![name]!
    for (const leftPath of leftPaths) {
      for (const rightPath of rightPaths) {
        if (
          !(
            leftPath.child &&
            rightPath.child &&
            leftPath.child.type === rightPath.child.type &&
            leftPath.child.relationship.parent ===
              rightPath.child.relationship.parent
          )
        ) {
          relationships.push({
            ancestor: name,
            left:
              leftPath.child === null
                ? null
                : {
                    type: leftPath.child.type,
                    child: leftPath.child.relationship,
                  },
            right:
              rightPath.child === null
                ? null
                : {
                    type: rightPath.child.type,
                    child: rightPath.child.relationship,
                  },
          })
        }
      }
    }
  }
  return relationships
}
