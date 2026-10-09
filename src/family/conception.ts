import type { Person, ReadonlyPerson } from "@family-tree/family/person"
import type { Birth, ReadonlyBirth } from "@family-tree/family/birth"

export interface Conception {
  father: Person | symbol
  birth: Birth
}

export type ReadonlyConception = {
  readonly father: ReadonlyPerson | symbol
  readonly birth: ReadonlyBirth
}
