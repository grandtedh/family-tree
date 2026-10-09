import type { FamilyTreeError } from "@family-tree/family/errors"
import type { FamilyTree } from "@family-tree/family/tree"

export interface FamilyTreeResultSuccess {
  success: true
  tree: FamilyTree
}

export interface FamilyTreeResultFailure<T extends FamilyTreeError> {
  success: false
  errors: T[]
}

export type FamilyTreeResult<T extends FamilyTreeError> =
  | FamilyTreeResultSuccess
  | FamilyTreeResultFailure<T>
