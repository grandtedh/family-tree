import { z } from "zod"
import { ImageUrl } from "./image"

export type StoredPerson = z.infer<typeof StoredPerson>
export type StoredConception = z.infer<typeof StoredConception>
export type StoredBirth = z.infer<typeof StoredBirth>

export type StorageId = z.infer<typeof StorageId>
export const StorageId = z.union([z.number(), z.string()])

export const StoredPerson = z.intersection(
  z.object({
    id: StorageId,
    name: z.string().nullish(),
    gender: z.literal(["m", "f"]),
    isHidden: z.boolean().nullish(),
    image: ImageUrl.nullish(),
  }),
  z.union([
    z.object({ conception: StorageId, generation: z.never().nullish() }),
    z.object({
      conception: z.never().nullish(),
      generation: z.number().nullish(),
    }),
  ]),
)

export const StoredConception = z.object({
  id: StorageId,
  father: StorageId.nullable(),
  birth: StorageId,
})

export const StoredBirth = z.object({
  id: StorageId,
  mother: StorageId.nullable(),
})
