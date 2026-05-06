RELEASE_DIR := dist
DEBUG_DIR := debug
SRC_DIR := src
TYPES_DIR := types

# Produces just the stem/basename without suffix or directory (e.g. 'jacquard')
SRC := $(notdir $(basename $(wildcard $(SRC_DIR)/*.cpp)))

RELEASE = $(addprefix $(RELEASE_DIR)/, $(addsuffix .js,$(SRC)) $(addsuffix .wasm,$(SRC)))
DEBUG = $(addprefix $(DEBUG_DIR)/, $(addsuffix .js,$(SRC)) $(addsuffix .wasm,$(SRC)))

CXX := em++
# Using recursively-expanded syntax here
# EXPORT_FLAGS and OPTIMIZATION_FLAGS are defined on a per-target basis
# So we need to delay expansion until after those are assigned
CXXFLAGS = -sEXPORT_ES6=1 -sALLOW_MEMORY_GROWTH=1 $(EXPORT_FLAGS) $(OPTIMIZATION_FLAGS)

.PHONY: clean clean-release clean-debug all release debug

# Target-specific variable assignments
%/jacquard.js %/jacquard.wasm: EXPORT_FLAGS := \
	-sEXPORTED_FUNCTIONS=_init,_jacquard,_malloc,_free \
    -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,HEAPU16,HEAPF64

%/relationships.js %/relationships.wasm: EXPORT_FLAGS := \
	-sEXPORTED_FUNCTIONS=_init,_get_relationships,_get_relationship_size,_get_parentage_size,_get_removal_offset,_get_cousinhood_offset,_get_parentages_offset,_get_parentage_length_offset,_get_left_father_offset,_get_left_mother_offset,_get_right_father_offset,_get_right_mother_offset,_malloc,_free \
	-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,HEAPU8,HEAPU16,HEAP16,HEAPU32,HEAP32,HEAPU64,HEAPF64

$(RELEASE): OPTIMIZATION_FLAGS := -O3

$(DEBUG): OPTIMIZATION_FLAGS := -O0 -g -sASSERTIONS=2 -sSTACK_OVERFLOW_CHECK=2 -fsanitize=address -sWARN_ON_UNDEFINED_SYMBOLS=1

# Rules
all: $(RELEASE) $(DEBUG)

release: $(RELEASE)

debug: $(DEBUG)

# Release static pattern
$(RELEASE_DIR)/%.js $(RELEASE_DIR)/%.wasm: $(SRC_DIR)/%.cpp
	@mkdir -p $(RELEASE_DIR)
	$(CXX) $(CXXFLAGS) -o $(RELEASE_DIR)/$*.js $<
	cp $(TYPES_DIR)/$*.d.ts $(RELEASE_DIR)/$*.d.ts

# Debug static pattern
$(DEBUG_DIR)/%.js $(DEBUG_DIR)/%.wasm: $(SRC_DIR)/%.cpp
	@mkdir -p $(DEBUG_DIR)
	$(CXX) $(CXXFLAGS) -o $(DEBUG_DIR)/$*.js $<
	cp $(TYPES_DIR)/$*.d.ts $(DEBUG_DIR)/$*.d.ts

clean: clean-release clean-debug

clean-release:
	rm -rf $(RELEASE_DIR)

clean-debug:
	rm -rf $(DEBUG_DIR)