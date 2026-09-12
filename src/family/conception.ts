import type { Person, ReadonlyPerson } from "./person"
import type { Birth, ReadonlyBirth } from "./birth"

export interface ReadonlyConception {
  readonly father: ReadonlyPerson | symbol
  readonly birth: ReadonlyBirth
}

export class Conception {
  father: Person | symbol
  birth: Birth

  constructor({ father, birth }: { father: Person | symbol; birth: Birth }) {
    this.father = father
    this.birth = birth
  }
}
