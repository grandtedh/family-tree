import { z } from "zod"

export type ImageUrl = z.infer<typeof ImageUrl>

export const ImageUrl = z.union([
  z.string(),
  z.readonly(
    z.object({
      type: z.literal(["url", "asset", "archive"]),
      url: z.string(),
    }),
  ),
])
