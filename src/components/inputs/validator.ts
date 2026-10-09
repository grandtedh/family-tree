import { z } from "zod"

export const nonNumberRegex = /(?!^-)[^\d.]/g

export const intValidator = z.compile(
  z
    .string()
    .nonempty("Must not be blank")
    .transform((arg) => Number(arg))
    .pipe(
      z
        .number("Must be a number")
        .max(Number.MAX_SAFE_INTEGER, "Too large")
        .min(Number.MIN_SAFE_INTEGER, "Too small"),
    )
    .pipe(z.int("Must be an integer")),
)
