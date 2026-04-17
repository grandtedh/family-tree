interface JacquardModule {
  _malloc: (size: number) => number
  _free: (ptr: number) => void
  _init: (inputPtr: number, inputLen: number) => number
  _jacquard: (a: number, b: number) => number
  HEAPU16: Uint16Array
  HEAPF64: Float64Array
  HEAP32: Int32Array
}

export default function createModule(): Promise<JacquardModule>
