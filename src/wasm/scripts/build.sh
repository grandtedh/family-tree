#!/bin/bash
pushd $(dirname -- "${BASH_SOURCE[0]}")
mkdir -p ../dist
em++ ../src/jacquard.cpp \
    -g \
    -o ../dist/jacquard.js \
    -sEXPORTED_FUNCTIONS=_init,_jacquard,_malloc,_free \
    -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,HEAPU16,HEAPF64 \
    -sEXPORT_ES6=1 \
    -sALLOW_MEMORY_GROWTH=1
em++ ../src/relationships.cpp \
        -g \
        -o ../dist/relationships.js \
        -sEXPORTED_FUNCTIONS=_init,_relationships,_get_relationship_size,_get_removal_offset,_get_cousinship_offset,_get_completeness_offset,_get_parentage_offset,_get_multiplicity_offset,_malloc,_free \
        -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,HEAPU8,HEAPU16,HEAP32,HEAPU64,HEAPF64 \
        -sEXPORT_ES6=1 \
        -sALLOW_MEMORY_GROWTH=1
cp ../types/*.d.ts ../dist/
popd