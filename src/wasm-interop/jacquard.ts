import createModule from "../wasm/dist/jacquard.js"

const JACQUARD_LENGTH = 9
const SIZEOF_SHORT = 2
// const SIZEOF_POINTER = 4
const SIZEOF_DOUBLE = 8

type JacquardCoefficients = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

interface GeneticSummary {
  aInbreeding: number
  bInbreeding: number
  kinship: number
  sharedDna: number
}

export default async function jacquard(
  familyTree: [number, number][],
): Promise<(a: number, b: number) => JacquardCoefficients> {
  const module = await createModule()
  const ptr = module._malloc(familyTree.length * 2 * SIZEOF_SHORT)
  module.HEAPU16.set(familyTree.flat(1), ptr / SIZEOF_SHORT)
  const initSuccess = module._init(ptr, familyTree.length)
  module._free(ptr)

  if (initSuccess !== 0) {
    throw new Error("Error initializing Jacquard coefficient module")
  }

  function getJacquardCoefficients(a: number, b: number): JacquardCoefficients {
    const outPtr = module._jacquard(a, b)
    const outArray = [
      ...module.HEAPF64.slice(
        outPtr / SIZEOF_DOUBLE,
        outPtr / SIZEOF_DOUBLE + JACQUARD_LENGTH,
      ),
    ] as JacquardCoefficients
    module._free(outPtr)
    return outArray
  }

  return getJacquardCoefficients
}

export function interpretJacquard(coefs: JacquardCoefficients): GeneticSummary {
  return {
    aInbreeding: coefs[0] + coefs[1] + coefs[2] + coefs[3],
    bInbreeding: coefs[0] + coefs[1] + coefs[4] + coefs[5],
    kinship: coefs[0] + (coefs[2] + coefs[4] + coefs[6]) / 2 + coefs[7] / 4,
    sharedDna: coefs[0] + coefs[6] + (coefs[2] + coefs[4] + coefs[7]) / 2,
  }
}
