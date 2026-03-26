(
    cd $(dirname -- "$0") \
    && mkdir -p ../dist \
    && em++ ../src/jacquard.cpp \
        -o ../dist/jacquard.js \
        -sEXPORTED_FUNCTIONS=_jacquard,_malloc,_free \
        -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,HEAPU16,HEAPF64 \
        -sEXPORT_ES6=1 \
        -sALLOW_MEMORY_GROWTH
)