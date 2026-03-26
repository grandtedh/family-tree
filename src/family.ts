import * as z from "zod"

// export interface Person {
//   id: string
//   name?: string | undefined
//   mother?: string | undefined
//   father?: string | undefined
//   gender: "m" | "f"
//   identicals?: string[] | undefined
//   fraternals?: string[] | undefined
//   isHidden?: boolean | undefined
// }

const Person = z.object({
  id: z.string(),
  name: z.string().optional(),
  father: z.string().optional(),
  mother: z.string().optional(),
  gender: z.literal(["m", "f"]),
  identicals: z.array(z.string()).optional(),
  fraternals: z.array(z.string()).optional(),
  isHidden: z.boolean().optional(),
})

export type Person = z.infer<typeof Person>
