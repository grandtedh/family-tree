import type { Person } from "@family-tree/family/person"
import type { StorageId } from "@family-tree/family/stored"

export type StoredValueType = "person" | "conception" | "birth"

export type Constructor<T> = abstract new (...args: never[]) => T

export function checkAllowedErrors<T extends Constructor<FamilyTreeError>>(
  errors: FamilyTreeError[],
  expectedErrors: T[],
): asserts errors is InstanceType<T>[] {
  for (const error of errors) {
    if (!expectedErrors.some((errorType) => error instanceof errorType)) {
      throw error
    }
  }
}

export abstract class FamilyTreeError extends Error {}

export class FamilyTreeDuplicateIdError extends FamilyTreeError {
  id: number
  constructor(id: number) {
    super(`Duplicate person ID: "${id}"`)
    this.id = id
  }
}

export class FamilyTreeUnrecognizedIdError extends FamilyTreeError {
  id: number
  constructor(id: number) {
    super(`Unrecognized person ID: "${id}"`)
    this.id = id
  }
}

export class FamilyTreeDuplicateStoredIdError extends FamilyTreeError {
  type: StoredValueType
  storedId: StorageId
  constructor(type: StoredValueType, storedId: StorageId) {
    super(`Duplicate ${type} ID: "${storedId}"`)
    this.type = type
    this.storedId = storedId
  }
}

export class FamilyTreeUnrecognizedStoredIdError extends FamilyTreeError {
  foundInType: StoredValueType
  foundInStoredId: StorageId
  expectedType: StoredValueType
  storedId: StorageId
  constructor(
    foundInType: StoredValueType,
    foundInStoredId: StorageId,
    expectedType: StoredValueType,
    storedId: StorageId,
  ) {
    super(
      `Unrecognized ${expectedType} stored ID found in ${foundInType} with stored ID ${foundInStoredId}: "${storedId}"`,
    )
    this.foundInType = foundInType
    this.foundInStoredId = foundInStoredId
    this.expectedType = expectedType
    this.storedId = storedId
  }
}

export class FamilyTreeCyclicAncestryError extends FamilyTreeError {
  person: Person
  constructor(person: Person) {
    super(
      `Person with ID ${person.id}, stored ID ${person.storedId} has cyclic ancestry`,
    )
    this.person = person
  }
}

export class FamilyTreeParentGenderError extends FamilyTreeError {
  parent: Person
  role: "father" | "mother"
  constructor(parent: Person, role: "father" | "mother") {
    super(
      `Person with ID ${parent.id}, stored ID ${parent.storedId} has invalid gender "${parent.gender}" for parental role "${role}"`,
    )
    this.parent = parent
    this.role = role
  }
}

export class FamilyTreeSelfingError extends FamilyTreeError {
  parent: Person
  person: Person
  constructor(parent: Person, person: Person) {
    super(
      `Person with ID ${parent.id}, stored ID ${parent.storedId} occupies both parental roles for person with ID ${person.id}, stored ID ${person.storedId}`,
    )
    this.parent = parent
    this.person = person
  }
}
