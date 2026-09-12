import type { Conception, ReadonlyConception } from "./conception"
import type { ImageUrl } from "./image"
import type { StorageId } from "./stored"

export type ReadonlyPerson = {
  readonly id: StorageId
  readonly conception: ReadonlyConception | undefined
} & Readonly<PersonAttributes>

export type PersonAttributes = Omit<Person, "id" | "conception">

export class Person {
  id: StorageId
  name: string | undefined
  conception: Conception | undefined
  generation: number | undefined
  gender: "m" | "f"
  isHidden: boolean
  image: ImageUrl | undefined

  constructor({
    id,
    name,
    conception,
    generation,
    gender = "m",
    isHidden = false,
    image,
  }: {
    id: StorageId
    conception?: Conception | undefined
  } & Partial<PersonAttributes>) {
    this.id = id
    this.name = name
    this.conception = conception
    this.generation = generation
    this.gender = gender
    this.isHidden = isHidden
    this.image = image
  }
}
