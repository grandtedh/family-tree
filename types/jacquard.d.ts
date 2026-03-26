declare module "../wasm/dist/jacquard*.js" {
    interface JacquardModule {
        _malloc: (size: number) => number
        _free: (ptr: number) => void
        _jacquard: ((inputPtr: number, inputLen: number) => number)
        HEAPU16: Uint16Array
        HEAPF64: Float64Array
        HEAP32: Int32Array
    }

    export default function createModule(): Promise<JacquardModule>
}