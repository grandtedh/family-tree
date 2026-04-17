interface RelationshipModule {
  _malloc: (size: number) => number
  _free: (ptr: number) => void
  _init: (inputPtr: number, inputLen: number) => void
  _relationships: (a: number, b: number, relationshipsPtr: number) => number
  _get_relationship_size: () => number
  _get_removal_offset: () => number
  _get_cousinship_offset: () => number
  _get_completeness_offset: () => number
  _get_parentage_offset: () => number
  _get_multiplicity_offset: () => number
  HEAPU8: Uint8Array
  HEAPU16: Uint16Array
  HEAP32: Int32Array
  HEAPU64: BigUint64Array
  HEAPF64: Float64Array
}

export default function createModule(): Promise<RelationshipModule>
