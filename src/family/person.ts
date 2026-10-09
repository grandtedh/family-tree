import type {
  Conception,
  ReadonlyConception,
} from "@family-tree/family/conception"
import type { ImageUrl } from "@family-tree/family/image"
import type { StorageId } from "@family-tree/family/stored"

export interface Person {
  id: number
  storedId: StorageId
  gender: "m" | "f"
  name: string | null
  conception: Conception | null
  generation: number | null
  image: ImageUrl | null
  isHidden: boolean
}

export type ReadonlyPerson = Readonly<Omit<Person, "conception">> & {
  readonly conception?: ReadonlyConception | null
}
