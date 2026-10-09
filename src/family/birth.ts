import type { Person, ReadonlyPerson } from "@family-tree/family/person"

export interface Birth {
  mother: Person | symbol
}

export type ReadonlyBirth = {
  readonly mother: ReadonlyPerson | symbol
}
