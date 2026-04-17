import * as z from "zod"

export const Person = z.object({
  id: z.string(),
  first: z.string().optional(),
  middle: z.string().optional(),
  last: z.string().optional(),
  father: z.string().optional(),
  mother: z.string().optional(),
  gender: z.literal(["m", "f"]),
  identicals: z.array(z.string()).default([]),
  fraternals: z.array(z.string()).default([]),
  isHidden: z.boolean().default(false),
})

export type PersonInput = z.input<typeof Person>

export type Person = z.output<typeof Person>

export const Family = z.array(Person)

export type FamilyInput = z.input<typeof Family>

export type Family = z.output<typeof Family>

export type FamilyTree = Map<string, z.output<typeof Person>>

export type FamilyTreeWarningCode =
  | "DUPLICATE_ID"
  | "UNKNOWN_FATHER"
  | "UNKNOWN_MOTHER"
  | "UNKNOWN_IDENTICAL"
  | "SELF_REFERENCE_IDENTICAL"
  | "HETEROPATERNAL_IDENTICAL"
  | "HETEROMATERNAL_IDENTICAL"
  | "NON_RECIPROCAL_IDENTICAL"
  | "UNKNOWN_FRATERNAL"
  | "SELF_REFERENCE_FRATERNAL"
  | "HETEROMATERNAL_FRATERNAL"
  | "NON_RECIPROCAL_FRATERNAL"
  | "CYCLIC_ANCESTRY"

export interface FamilyTreeWarning {
  id: string
  code: FamilyTreeWarningCode
  message: string
}

export function getFamilyTree(family: Readonly<Family>) {
  const warnings: FamilyTreeWarning[] = []
  const familyTree: FamilyTree = new Map()
  for (const person of family) {
    const clone = structuredClone(person)
    if (familyTree.has(person.id)) {
      warnings.push({
        id: person.id,
        code: "DUPLICATE_ID",
        message: `Duplicate id ${person.id}`,
      })
    } else {
      familyTree.set(person.id, clone)
    }
  }
  for (const [id, person] of familyTree) {
    if (person.father !== undefined && !familyTree.has(person.father)) {
      warnings.push({
        id,
        code: "UNKNOWN_FATHER",
        message: `Unknown father ${person.father} for ${id}`,
      })
      person.father = undefined
    }
    if (person.mother !== undefined && !familyTree.has(person.mother)) {
      warnings.push({
        id,
        code: "UNKNOWN_MOTHER",
        message: `Unknown mother ${person.mother} for ${id}`,
      })
      person.mother = undefined
    }
  }
  for (const [id, person] of familyTree) {
    person.identicals = person.identicals.filter((identicalId) => {
      if (!familyTree.has(identicalId)) {
        warnings.push({
          id,
          code: "UNKNOWN_IDENTICAL",
          message: `Unknown identical ${identicalId} for ${id}`,
        })
        return false
      }
      if (id === identicalId) {
        warnings.push({
          id,
          code: "SELF_REFERENCE_IDENTICAL",
          message: `Invalid self-reference in identicals for ${id}`,
        })
        return false
      }
      const identical = familyTree.get(identicalId)!
      if (person.father !== identical.father) {
        warnings.push({
          id,
          code: "HETEROPATERNAL_IDENTICAL",
          message: `Identical ${identicalId} for ${id} has a different father`,
        })
        return false
      }
      if (person.mother !== identical.mother) {
        warnings.push({
          id,
          code: "HETEROMATERNAL_IDENTICAL",
          message: `Identical ${identicalId} for ${id} has a different mother`,
        })
        return false
      }
      if (!identical.identicals.includes(id)) {
        warnings.push({
          id,
          code: "NON_RECIPROCAL_IDENTICAL",
          message: `Identical ${identicalId} for ${id} does not reciprocate`,
        })
        return false
      }
      return true
    })
    person.fraternals = person.fraternals.filter((fraternalId) => {
      if (!familyTree.has(fraternalId)) {
        warnings.push({
          id,
          code: "UNKNOWN_FRATERNAL",
          message: `Unknown fraternal ${fraternalId} for ${id}`,
        })
        return false
      }
      if (id === fraternalId) {
        warnings.push({
          id,
          code: "SELF_REFERENCE_FRATERNAL",
          message: `Invalid self-reference in fraternals for ${id}`,
        })
        return false
      }
      const fraternal = familyTree.get(fraternalId)!
      // May have a different father: heteropaternal superfecundation
      if (person.mother !== fraternal.mother) {
        warnings.push({
          id,
          code: "HETEROMATERNAL_FRATERNAL",
          message: `Fraternal ${fraternalId} for ${id} has a different mother`,
        })
        return false
      }
      if (!fraternal.fraternals.includes(id)) {
        warnings.push({
          id,
          code: "NON_RECIPROCAL_FRATERNAL",
          message: `Fraternal ${fraternalId} for ${id} does not reciprocate`,
        })
        return false
      }
      return true
    })
  }

  const generations = getGenerations(familyTree)

  for (const [id] of familyTree) {
    if (!generations.has(id)) {
      warnings.push({
        id,
        code: "CYCLIC_ANCESTRY",
        message: `${id} has cyclic ancestry`,
      })
      familyTree.delete(id)
    }
  }

  return {
    warnings,
    familyTree,
    generations,
  }
}

export function getGenerations(familyTree: FamilyTree) {
  const adjacencyList = new Map<string, Set<string>>()
  const numParents = new Map<string, number>()
  const founders: string[] = []
  const generations = new Map<string, number>()
  for (const [id, person] of familyTree) {
    numParents.set(id, 0)
    if (person.father !== undefined) {
      if (!adjacencyList.has(person.father)) {
        adjacencyList.set(person.father, new Set())
      }
      adjacencyList.get(person.father)!.add(id)
      numParents.set(id, numParents.get(id)! + 1)
    }
    if (person.mother !== undefined) {
      if (!adjacencyList.has(person.mother)) {
        adjacencyList.set(person.mother, new Set())
      }
      adjacencyList.get(person.mother)!.add(id)
      numParents.set(id, numParents.get(id)! + 1)
    }
    if (person.father === undefined && person.mother === undefined) {
      founders.push(id)
      generations.set(id, 1)
    }
  }

  const toVisit = founders.slice()
  while (toVisit.length) {
    const visiting = toVisit.shift()!
    for (const childId of adjacencyList.get(visiting) ?? []) {
      numParents.set(childId, numParents.get(childId)! - 1)
      if (numParents.get(childId)! <= 0) {
        generations.set(childId, generations.get(visiting)! + 1)
        toVisit.push(childId)
      }
    }
  }

  return generations
}
