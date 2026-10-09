import { z } from "zod"

export type FamilyTreeOptions = z.infer<typeof StoredOptions>

export const StoredOptions = z.readonly(
  z.object({
    preventAncestryCycles: z.boolean(),
    enforceParentGender: z.boolean(),
    preventSelfing: z.boolean(),
  }),
)
