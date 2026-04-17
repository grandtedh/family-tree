import { test, expect } from "vitest"
import {
  getFamilyTree,
  getGenerations,
  type FamilyInput,
  Family,
} from "@family-tree/trees/family"

const testFamily: FamilyInput = [
  { id: "a", gender: "m" },
  { id: "b", gender: "f" },
  { id: "c", father: "a", mother: "b", gender: "m" },
  { id: "d", father: "a", mother: "b", gender: "f" },
]

test("Check family generations", () => {
  const { warnings, familyTree } = getFamilyTree(Family.parse(testFamily))
  expect(warnings.length, "Valid family produced warnings").toBe(0)
  const generations = getGenerations(familyTree)
  expect(generations.get("a")).toBe(1)
  expect(generations.get("b")).toBe(1)
  expect(generations.get("c")).toBe(2)
  expect(generations.get("d")).toBe(2)
})

const cyclicFamily: FamilyInput = [
  ...testFamily,
  { id: "e", father: "g", mother: "h", gender: "m" },
  { id: "f", father: "g", mother: "h", gender: "f" },
  { id: "g", father: "e", mother: "f", gender: "m" },
  { id: "h", father: "e", mother: "f", gender: "f" },
  { id: "i", father: "d", mother: "j", gender: "f" },
  { id: "j", father: "d", mother: "i", gender: "f" },
]

test("Check cycle detection", () => {
  const { warnings } = getFamilyTree(Family.parse(cyclicFamily))
  expect(warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "e", code: "CYCLIC_ANCESTRY" }),
    ]),
  )
  expect(warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "f", code: "CYCLIC_ANCESTRY" }),
    ]),
  )
  expect(warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "g", code: "CYCLIC_ANCESTRY" }),
    ]),
  )
  expect(warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "h", code: "CYCLIC_ANCESTRY" }),
    ]),
  )
  expect(warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "i", code: "CYCLIC_ANCESTRY" }),
    ]),
  )
  expect(warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "j", code: "CYCLIC_ANCESTRY" }),
    ]),
  )
})
