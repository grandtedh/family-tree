import {
  getGenerations,
  Person,
  type FamilyTree,
} from "@family-tree/trees/family.js"
import createModule from "../wasm/dist/relationships.js"

const SIZEOF_CHAR = 1
const SIZEOF_SHORT = 2
const SIZEOF_LONG = 4
const SIZEOF_LONG_LONG = 8
const SIZEOF_POINTER = 4

// Completeness enums
const HALF = 0
const FULL = 1

// Parentage enums
const ALLOGAMOUS = 0
const ALLOGAMOUS_CROSS = 1
const AUTOGAMOUS = 2
const PARENTAGE_FATHER = 3
const PARENTAGE_MOTHER = 4

export interface Relationship {
  removal: number
  cousinship: number
  completeness: number
  parentage: number
  multiplicity: number
}

export default async function relationships(
  familyTree: FamilyTree,
): Promise<(a: string, b: string) => Relationship[] | null> {
  const { idMap, numericalFamilyTree } = familyTreeToArray(familyTree)
  const module = await createModule()
  const ptr = module._malloc(numericalFamilyTree.length * 2 * SIZEOF_SHORT)
  module.HEAPU16.set(numericalFamilyTree.flat(1), ptr / SIZEOF_SHORT)
  module._init(ptr, numericalFamilyTree.length)
  module._free(ptr)

  const relationshipSize = module._get_relationship_size()
  const removalOffset = module._get_removal_offset()
  const cousinshipOffset = module._get_cousinship_offset()
  const completenessOffset = module._get_completeness_offset()
  const parentageOffset = module._get_parentage_offset()
  const multiplicityOffset = module._get_multiplicity_offset()

  function getRelationships(a: string, b: string): Relationship[] | null {
    const aId = idMap.get(a)
    const bId = idMap.get(b)
    if (aId === undefined) {
      return null
    }
    if (bId === undefined) {
      return null
    }
    const inPtr = module._malloc(SIZEOF_POINTER)
    const arrLength = module._relationships(aId, bId, inPtr)
    const arrPtr = module.HEAP32[inPtr / SIZEOF_POINTER]!
    const relationships: Relationship[] = []
    for (let i = 0; i < arrLength; i++) {
      const indexOffset = arrPtr + i * relationshipSize
      const removal =
        module.HEAP32[(indexOffset + removalOffset) / SIZEOF_LONG]!
      const cousinship =
        module.HEAPU16[(indexOffset + cousinshipOffset) / SIZEOF_SHORT]!
      const completeness =
        module.HEAPU8[(indexOffset + completenessOffset) / SIZEOF_CHAR]!
      const parentage =
        module.HEAPU8[(indexOffset + parentageOffset) / SIZEOF_CHAR]!
      const multiplicity =
        module.HEAPU64[(indexOffset + multiplicityOffset) / SIZEOF_LONG_LONG]!
      relationships.push({
        removal,
        cousinship,
        completeness,
        parentage,
        multiplicity: Number(multiplicity),
      })
    }
    module._free(arrPtr)
    module._free(inPtr)
    return relationships
  }

  return getRelationships
}

export function relationshipToString(
  relationship: Relationship,
  person: Person,
) {
  let term
  const prefix =
    Math.abs(relationship.removal) < 2
      ? ""
      : "great-".repeat(Math.abs(relationship.removal) - 2) + "grand"
  switch (relationship.cousinship) {
    case 0:
      // Lineal ancestry/descent
      if (relationship.removal === 0) {
        term = "self"
      } else if (relationship.removal > 0) {
        if (person.gender === "m") {
          term = prefix + "father"
        } else {
          if (relationship.parentage === PARENTAGE_FATHER) {
            term = prefix + "sire"
          } else {
            term = prefix + "mother"
          }
        }
      } else {
        if (person.gender === "m") {
          term = prefix + "son"
        } else {
          term = prefix + "daughter"
        }
      }
      break
    case 1:
      // Sibling/aunt/uncle/niece/nephew
      if (relationship.removal === 0) {
        if (person.gender === "m") {
          term = "brother"
        } else {
          term = "sister"
        }
      } else if (relationship.removal > 0) {
        if (person.gender === "m") {
          term = prefix + "uncle"
        } else {
          term = prefix + "aunt"
        }
      } else {
        if (person.gender === "m") {
          term = prefix + "nephew"
        } else {
          term = prefix + "niece"
        }
      }
      break
    default:
      // Cousin
      if (relationship.cousinship === 2 && relationship.removal === 0) {
        term = "cousin"
      } else {
        term =
          `${ordinal(relationship.cousinship - 1)} cousin` +
          (relationship.removal === 0
            ? ""
            : ` ${multiplicativeAdverb(Math.abs(relationship.removal))} removed (${relationship.removal > 0 ? "ascending" : "descending"})`)
      }
  }
  const multiplicity =
    relationship.multiplicity === 1
      ? ""
      : multiplicativeAdjective(relationship.multiplicity) + " "
  const completeness =
    relationship.completeness === HALF && relationship.cousinship >= 1
      ? "half-"
      : ""
  let parentage
  switch (relationship.parentage) {
    case ALLOGAMOUS_CROSS:
      parentage = "cross-"
      break
    case AUTOGAMOUS:
      parentage = "selfed "
      break
    default:
      parentage = ""
  }
  return `${multiplicity}${parentage}${completeness}${term}`
}

function familyTreeToArray(familyTree: FamilyTree) {
  const generations = getGenerations(familyTree)
  const topologicalSort = [...familyTree.keys()].sort(
    (a, b) => generations.get(a)! - generations.get(b)!,
  )
  const idMap = new Map<string, number>()
  const numericalFamilyTree: [number, number][] = [[0, 0]]
  let nextId = 1
  for (const id of topologicalSort) {
    const person = familyTree.get(id)!
    // Unlike Jacquard, don't treat twins as the same person
    const numericalId = nextId++
    idMap.set(id, numericalId)
    numericalFamilyTree[numericalId] = [
      person.father === undefined ? 0 : (idMap.get(person.father) ?? 0),
      person.mother === undefined ? 0 : (idMap.get(person.mother) ?? 0),
    ]
  }
  // No need to invent founders to fill in parent gaps

  return {
    idMap,
    numericalFamilyTree,
  }
}

function ordinal(n: number) {
  switch (n) {
    case 0:
      return "zeroth"
    case 1:
      return "first"
    case 2:
      return "second"
    case 3:
      return "third"
    case 4:
      return "fourth"
    case 5:
      return "fifth"
    case 6:
      return "sixth"
    case 7:
      return "seventh"
    case 8:
      return "eighth"
    case 9:
      return "ninth"
    case 10:
      return "tenth"
    case 11:
      return "eleventh"
    case 12:
      return "twelfth"
    case 13:
      return "thirteenth"
    case 14:
      return "fourteenth"
    case 15:
      return "fifteenth"
    case 16:
      return "sixteenth"
    case 17:
      return "seventeenth"
    case 18:
      return "eighteenth"
    case 19:
      return "nineteenth"
    case 20:
      return "twentieth"
    default:
      const lastDigit = n % 10
      switch (lastDigit) {
        case 1:
          return n + "st"
        case 2:
          return n + "nd"
        case 3:
          return n + "rd"
        default:
          return n + "th"
      }
  }
}

function multiplicativeAdverb(n: number) {
  switch (n) {
    case 1:
      return "once"
    case 2:
      return "twice"
    case 3:
      return "thrice"
    default:
      return `${n} times`
  }
}

export function multiplicativeAdjective(n: number) {
  switch (n) {
    case 1:
      return "single"
    case 2:
      return "double"
    case 3:
      return "triple"
    case 4:
      return "quadruple"
    case 5:
      return "quintuple"
    case 6:
      return "sextuple"
    case 7:
      return "septuple"
    case 8:
      return "octuple"
    case 9:
      return "nonuple"
    case 10:
      return "dectuple"
    case 11:
      return "undectuple"
    case 12:
      return "duodectuple"
    default:
      return `${n}-times`
  }
}
