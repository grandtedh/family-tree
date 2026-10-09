import { z } from "zod"
import { ImageUrl } from "@family-tree/family/image"

export type StorageId = z.infer<typeof StorageId>
export type StoredPerson = z.infer<typeof StoredPerson>
export type StoredConception = z.infer<typeof StoredConception>
export type StoredBirth = z.infer<typeof StoredBirth>
export type StoredTree = z.infer<typeof StoredTree>

export const StorageId = z.union([z.number(), z.string()])

export const StoredPerson = z.readonly(
  z.object({
    id: StorageId,
    gender: z.literal(["m", "f"]),
    name: z.string().nullish(),
    conception: StorageId.nullish(),
    generation: z.number().int().nullish(),
    image: ImageUrl.nullish(),
    isHidden: z.boolean().nullish(),
  }),
)

export const StoredConception = z.readonly(
  z.object({
    id: StorageId,
    father: StorageId.nullable(),
    birth: StorageId,
  }),
)

export const StoredBirth = z.readonly(
  z.object({
    id: StorageId,
    mother: StorageId.nullable(),
  }),
)

export const StoredTree = z.readonly(
  z.object({
    people: z.array(StoredPerson),
    conceptions: z.array(StoredConception),
    births: z.array(StoredBirth),
  }),
)
