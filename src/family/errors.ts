import type { StorageId } from "./stored"
type StoredValueType = "person" | "conception" | "birth"

export class FamilyTreeError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export class FamilyTreeDuplicateIdError extends FamilyTreeError {
  static readonly CODE = "duplicate_id"
  constructor(type: StoredValueType, id: StorageId) {
    super(FamilyTreeDuplicateIdError.CODE, `Duplicate ${type} ID: "${id}"`)
  }
}

export class FamilyTreeUnrecognizedIdError extends FamilyTreeError {
  static readonly CODE = "unrecognized_id"
  constructor(id: StorageId) {
    super(
      FamilyTreeUnrecognizedStoredIdError.CODE,
      `Unrecognized person ID: "${id}"`,
    )
  }
}

export class FamilyTreeUnrecognizedStoredIdError extends FamilyTreeError {
  static readonly CODE = "unrecognized_stored_id"
  constructor(
    foundInType: StoredValueType,
    foundInId: StorageId,
    expectedType: StoredValueType,
    id: StorageId,
  ) {
    super(
      FamilyTreeUnrecognizedStoredIdError.CODE,
      `Unrecognized ${expectedType} ID found in ${foundInType} with ID ${foundInId}: "${id}"`,
    )
  }
}

export class FamilyTreeCyclicAncestryError extends FamilyTreeError {
  static readonly CODE = "cyclic_ancestry"
  constructor(ids: Set<StorageId>) {
    super(
      FamilyTreeCyclicAncestryError.CODE,
      `People with ID(s) {${[...ids].join(", ")}} have cyclic ancestry.`,
    )
  }
}
