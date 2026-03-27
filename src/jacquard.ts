import createModule from "../wasm/dist/jacquard.js"

const JACQUARD_LENGTH = 9
const SIZEOF_SHORT = 2
// const SIZEOF_POINTER = 4
const SIZEOF_DOUBLE = 8

export default async function jacquard(a: number, b: number, familyTree: [number, number][]): Promise<[number, number, number, number, number, number, number, number, number]> {
    const module = await createModule()
    const ptr = module._malloc(familyTree.length * 2 * SIZEOF_SHORT)
    module.HEAPU16.set(familyTree.flat(1), ptr / SIZEOF_SHORT)

    const outPtr = module._jacquard(a, b, ptr, familyTree.length)
    module._free(ptr)
    const outArray = [...module.HEAPF64.slice(outPtr / SIZEOF_DOUBLE, outPtr / SIZEOF_DOUBLE + JACQUARD_LENGTH)] as [number, number, number, number, number, number, number, number, number]
    module._free(outPtr)
    return outArray
}