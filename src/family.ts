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

const Family = z
  .array(Person)
  .superRefine((val, ctx) => {})
  .superRefine((val, ctx) => {
    const ids = val.map((person) => person.id)
    for (const person of val) {
      if (person.mother !== undefined && !ids.includes(person.mother)) {
        ctx.addIssue({
          code: "custom",
          message: `Invalid id ${person.mother} for mother of ${person.id}.`,
          input: val,
        })
      }
      if (person.father !== undefined && !ids.includes(person.father)) {
        ctx.addIssue({
          code: "custom",
          message: `Invalid id ${person.father} for father of ${person.id}.`,
          input: val,
        })
      }
      for (const identicalId of person.identicals ?? []) {
        const identical = val.find((person) => person.id === identical)
      }
    }
  })

export type Person = z.infer<typeof Person>
