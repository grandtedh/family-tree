import { getGenerations, type FamilyTree } from "@family-tree/trees/family.js"
import createModule from "@family-tree/wasm/dist/jacquard"

const SIZEOF_SHORT = 2
const SIZEOF_DOUBLE = 8

export interface JacquardCoefficients {
  delta1: number
  delta2: number
  delta3: number
  delta4: number
  delta5: number
  delta6: number
  delta7: number
  delta8: number
  delta9: number
}

export interface GeneticSummary {
  aInbreeding: number
  bInbreeding: number
  kinship: number
  sharedDna: number
}

export default async function jacquard(
  familyTree: FamilyTree,
): Promise<(a: string, b: string) => JacquardCoefficients | null> {
  const { idMap, numericalFamilyTree } = familyTreeToArray(familyTree)
  const module = await createModule()
  const ptr = module._malloc(numericalFamilyTree.length * 2 * SIZEOF_SHORT)
  module.HEAPU16.set(numericalFamilyTree.flat(1), ptr / SIZEOF_SHORT)
  const initSuccess = module._init(ptr, numericalFamilyTree.length)
  module._free(ptr)

  if (initSuccess !== 0) {
    throw new Error("Error initializing Jacquard coefficient module")
  }

  function getJacquardCoefficients(
    a: string,
    b: string,
  ): JacquardCoefficients | null {
    const aId = idMap.get(a)
    const bId = idMap.get(b)
    if (aId === undefined) {
      return null
    }
    if (bId === undefined) {
      return null
    }
    const outPtr = module._jacquard(aId, bId)
    const coefs = {
      delta1: module.HEAPF64[outPtr / SIZEOF_DOUBLE]!,
      delta2: module.HEAPF64[outPtr / SIZEOF_DOUBLE + 1]!,
      delta3: module.HEAPF64[outPtr / SIZEOF_DOUBLE + 2]!,
      delta4: module.HEAPF64[outPtr / SIZEOF_DOUBLE + 3]!,
      delta5: module.HEAPF64[outPtr / SIZEOF_DOUBLE + 4]!,
      delta6: module.HEAPF64[outPtr / SIZEOF_DOUBLE + 5]!,
      delta7: module.HEAPF64[outPtr / SIZEOF_DOUBLE + 6]!,
      delta8: module.HEAPF64[outPtr / SIZEOF_DOUBLE + 7]!,
      delta9: module.HEAPF64[outPtr / SIZEOF_DOUBLE + 8]!,
    }
    module._free(outPtr)
    return coefs
  }

  return getJacquardCoefficients
}

export function interpretJacquard(coefs: JacquardCoefficients): GeneticSummary {
  return {
    aInbreeding: coefs.delta1 + coefs.delta2 + coefs.delta3 + coefs.delta4,
    bInbreeding: coefs.delta1 + coefs.delta2 + coefs.delta5 + coefs.delta6,
    kinship:
      coefs.delta1 +
      (coefs.delta3 + coefs.delta5 + coefs.delta7) / 2 +
      coefs.delta8 / 4,
    sharedDna:
      coefs.delta1 +
      coefs.delta7 +
      (coefs.delta3 + coefs.delta5 + coefs.delta8) / 2,
  }
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
    // Identical twins share all their genes and have the same parents
    // Treat them as the same person
    const identicalId = person.identicals.find((identicalId) =>
      idMap.has(identicalId),
    )
    if (identicalId !== undefined) {
      idMap.set(id, idMap.get(identicalId)!)
    } else {
      const numericalId = nextId++
      idMap.set(id, numericalId)
      numericalFamilyTree[numericalId] = [
        person.father === undefined ? 0 : (idMap.get(person.father) ?? 0),
        person.mother === undefined ? 0 : (idMap.get(person.mother) ?? 0),
      ]
    }
  }
  // For simplicity, the algorithm assumes all people have both parents or neither
  // So invent founders for one-parent individuals
  for (let i = 1; i < numericalFamilyTree.length; i++) {
    const parentage = numericalFamilyTree[i]!
    if (parentage[0] !== 0 && parentage[1] === 0) {
      parentage[1] = nextId++
      numericalFamilyTree.push([0, 0])
    }
    if (parentage[0] === 0 && parentage[1] !== 0) {
      parentage[0] = nextId++
      numericalFamilyTree.push([0, 0])
    }
  }

  return {
    idMap,
    numericalFamilyTree,
  }
}
