import createModule from "../wasm/dist/relationships.js"

const SIZEOF_CHAR = 1
const SIZEOF_SHORT = 2
const SIZEOF_LONG = 4
const SIZEOF_LONG_LONG = 8
const SIZEOF_POINTER = 4

export interface Relationship {
  removal: number
  cousinship: number
  completeness: number
  parentage: number
  multiplicity: number
}

export default async function relationships(
  familyTree: [number, number][],
): Promise<(a: number, b: number) => void> {
  const module = await createModule()
  const ptr = module._malloc(familyTree.length * 2 * SIZEOF_SHORT)
  module.HEAPU16.set(familyTree.flat(1), ptr / SIZEOF_SHORT)
  module._init(ptr, familyTree.length)
  module._free(ptr)

  const relationshipSize = module._get_relationship_size()
  const removalOffset = module._get_removal_offset()
  const cousinshipOffset = module._get_cousinship_offset()
  const completenessOffset = module._get_completeness_offset()
  const parentageOffset = module._get_parentage_offset()
  const multiplicityOffset = module._get_multiplicity_offset()

  function getRelationships(a: number, b: number): Relationship[] {
    const inPtr = module._malloc(SIZEOF_POINTER)
    const arrLength = module._relationships(a, b, inPtr)
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
