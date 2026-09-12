import { z } from "zod"

export type ImageUrl = z.infer<typeof ImageUrl>

export const ImageUrl = z.union([
  z.string(),
  z.object({
    type: z.literal(["url", "asset", "archive"]),
    url: z.string(),
  }),
])

export type ImageRepository = Map<string, File>

export function resolveImage(
  url: ImageUrl,
  imageRepository?: ImageRepository | undefined,
): string | URL | undefined {
  if (url === null || url === undefined) {
    return undefined
  }
  if (typeof url === "string") {
    return url
  }
  switch (url.type) {
    case "url": {
      return url.url
    }
    case "asset": {
      const globbed = import.meta.glob("@families/img/*", {
        eager: true,
        query: "?url",
      })
      return globbed[url.url]
    }
    case "archive": {
      const imgFile = imageRepository?.get(url.url)
      if (imgFile === undefined) {
        return undefined
      }
      return URL.createObjectURL(imgFile)
    }
  }
}
