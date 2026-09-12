import type { Person, ReadonlyPerson } from "./person"

export interface ReadonlyBirth {
  readonly mother: ReadonlyPerson | symbol
}

export class Birth {
  mother: Person | symbol

  constructor({ mother }: { mother: Person | symbol }) {
    this.mother = mother
  }
}
