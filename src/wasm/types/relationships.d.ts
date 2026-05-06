interface RelationshipModule {
  _malloc: (size: number) => number
  _free: (ptr: number) => void
  _init: (inputPtr: number, inputLen: number) => void
  _get_relationships: (a: number, b: number, relationshipsPtr: number) => number
  _get_relationship_size: () => number
  _get_parentage_size: () => number
  _get_removal_offset: () => number
  _get_cousinhood_offset: () => number
  _get_parentages_offset: () => number
  _get_parentage_length_offset: () => number
  _get_left_father_offset: () => number
  _get_left_mother_offset: () => number
  _get_right_father_offset: () => number
  _get_right_mother_offset: () => number
  HEAPU8: Uint8Array
  HEAPU16: Uint16Array
  HEAP16: Int16Array
  HEAPU32: Uint32Array
  HEAP32: Int32Array
  HEAPU64: BigUint64Array
  HEAPF64: Float64Array
}

export default function createModule(): Promise<RelationshipModule>
