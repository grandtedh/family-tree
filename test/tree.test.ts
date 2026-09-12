import { describe, expect, it } from "vitest"

import { FamilyTree } from "@family-tree/family/tree"
import {
  FamilyTreeDuplicateIdError,
  FamilyTreeUnrecognizedStoredIdError,
} from "@family-tree/family/errors"
import type { Person } from "@family-tree/family/person"

describe("FamilyTree", () => {
  describe("construction", () => {
    it("constructs a tree containing founders", () => {
      const tree = new FamilyTree(
        [
          {
            id: 1,
            name: "Alice",
            gender: "f",
            generation: 1,
          },
          {
            id: 2,
            name: "Bob",
            gender: "m",
            generation: 1,
          },
        ],
        [],
        [],
      )

      expect(tree.people.size).toBe(2)

      const alice = tree.people.get(1)!
      const bob = tree.people.get(2)!

      expect(alice.name).toBe("Alice")
      expect(alice.gender).toBe("f")
      expect(alice.conception).toBeUndefined()
      expect(alice.generation).toBe(1)

      expect(bob.name).toBe("Bob")
      expect(bob.gender).toBe("m")
      expect(bob.conception).toBeUndefined()
      expect(bob.generation).toBe(1)
    })

    it("constructs parent relationships correctly", () => {
      const tree = new FamilyTree(
        [
          { id: 1, name: "Mother", gender: "f", generation: 1 },
          { id: 2, name: "Father", gender: "m", generation: 1 },
          { id: 3, name: "Child", gender: "f", conception: 10 },
        ],
        [{ id: 10, father: 2, birth: 20 }],
        [{ id: 20, mother: 1 }],
      )

      const mother = tree.people.get(1)!
      const father = tree.people.get(2)!
      const child = tree.people.get(3)!

      expect(child.conception).toBeDefined()
      expect(child.conception!.father).toBe(father)
      expect(child.conception!.birth.mother).toBe(mother)

      expect(mother.conception).toBeUndefined()
      expect(father.conception).toBeUndefined()
    })

    it("shares the same Conception object between identical twins", () => {
      const tree = new FamilyTree(
        [
          { id: 1, name: "Mother", gender: "f", generation: 1 },
          { id: 2, name: "Father", gender: "m", generation: 1 },
          { id: 3, name: "Twin A", gender: "f", conception: 10 },
          { id: 4, name: "Twin B", gender: "m", conception: 10 },
        ],
        [{ id: 10, father: 2, birth: 20 }],
        [{ id: 20, mother: 1 }],
      )

      const twinA = tree.people.get(3)!
      const twinB = tree.people.get(4)!

      expect(twinA.conception).toBe(twinB.conception)
      expect(twinA.conception!.father).toBe(tree.people.get(2))
      expect(twinA.conception!.birth.mother).toBe(tree.people.get(1))
    })

    it("gives fraternal twins different Conception objects sharing one Birth", () => {
      const tree = new FamilyTree(
        [
          { id: 1, name: "Mother", gender: "f", generation: 1 },
          { id: 2, name: "Father A", gender: "m", generation: 1 },
          { id: 3, name: "Father B", gender: "m", generation: 1 },
          { id: 4, name: "Twin A", gender: "f", conception: 10 },
          { id: 5, name: "Twin B", gender: "m", conception: 11 },
        ],
        [
          { id: 10, father: 2, birth: 20 },
          { id: 11, father: 3, birth: 20 },
        ],
        [{ id: 20, mother: 1 }],
      )

      const twinA = tree.people.get(4)!
      const twinB = tree.people.get(5)!

      expect(twinA.conception).not.toBe(twinB.conception)
      expect(twinA.conception!.birth).toBe(twinB.conception!.birth)
      expect(twinA.conception!.father).toBe(tree.people.get(2))
      expect(twinB.conception!.father).toBe(tree.people.get(3))
      expect(twinA.conception!.birth.mother).toBe(tree.people.get(1))
    })

    it("creates anonymous mother and father people for null parent IDs", () => {
      const tree = new FamilyTree(
        [{ id: 1, name: "Child", gender: "f", conception: 10 }],
        [{ id: 10, father: null, birth: 20 }],
        [{ id: 20, mother: null }],
      )

      const child = tree.people.get(1)!

      expect(child.conception).toBeDefined()

      const father = child.conception!.father
      const mother = child.conception!.birth.mother

      expect(typeof father).toBe("symbol")

      expect(typeof mother).toBe("symbol")
    })
  })

  describe("validation errors", () => {
    it("rejects duplicate person IDs", () => {
      expect(
        () =>
          new FamilyTree(
            [
              { id: 1, name: "Alice", gender: "f" },
              { id: 1, name: "Bob", gender: "m" },
            ],
            [],
            [],
          ),
      ).toThrow(FamilyTreeDuplicateIdError)

      try {
        new FamilyTree(
          [
            { id: 1, name: "Alice", gender: "f" },
            { id: 1, name: "Bob", gender: "m" },
          ],
          [],
          [],
        )
      } catch (error) {
        expect(error).toBeInstanceOf(FamilyTreeDuplicateIdError)
        expect((error as FamilyTreeDuplicateIdError).code).toBe("duplicate_id")
      }
    })

    it("rejects duplicate conception IDs", () => {
      expect(
        () =>
          new FamilyTree(
            [{ id: 1, gender: "f" }],
            [
              { id: 10, father: null, birth: 20 },
              { id: 10, father: null, birth: 20 },
            ],
            [{ id: 20, mother: null }],
          ),
      ).toThrowError(FamilyTreeDuplicateIdError)
    })

    it("rejects duplicate birth IDs", () => {
      expect(
        () =>
          new FamilyTree(
            [{ id: 1, gender: "f" }],
            [],
            [
              { id: 20, mother: 1 },
              { id: 20, mother: 1 },
            ],
          ),
      ).toThrow(FamilyTreeDuplicateIdError)
    })

    it("rejects an unrecognized mother ID", () => {
      expect(() => new FamilyTree([], [], [{ id: 20, mother: 999 }])).toThrow(
        FamilyTreeUnrecognizedStoredIdError,
      )
    })

    it("rejects an unrecognized father ID", () => {
      expect(
        () =>
          new FamilyTree(
            [],
            [{ id: 10, father: 999, birth: 20 }],
            [{ id: 20, mother: null }],
          ),
      ).toThrow(FamilyTreeUnrecognizedStoredIdError)
    })

    it("rejects an unrecognized birth ID", () => {
      expect(
        () => new FamilyTree([{ id: 1, gender: "f", conception: 999 }], [], []),
      ).toThrow(FamilyTreeUnrecognizedStoredIdError)
    })

    it("rejects an unrecognized conception ID", () => {
      expect(
        () => new FamilyTree([{ id: 1, gender: "f", conception: 999 }], [], []),
      ).toThrow(FamilyTreeUnrecognizedStoredIdError)
    })
  })

  describe("serialization", () => {
    it("serializes founders", () => {
      const tree = new FamilyTree(
        [
          {
            id: 1,
            name: "Alice",
            gender: "f",
            generation: 3,
            isHidden: true,
          },
          {
            id: 2,
            name: "Bob",
            gender: "m",
            generation: 7,
          },
        ],
        [],
        [],
      )

      expect(tree.serialize()).toEqual({
        people: [
          {
            id: 1,
            name: "Alice",
            gender: "f",
            isHidden: true,
            generation: 3,
            image: undefined,
          },
          {
            id: 2,
            name: "Bob",
            gender: "m",
            isHidden: false,
            generation: 7,
            image: undefined,
          },
        ],
        conceptions: [],
        births: [],
      })
    })

    it("serializes a parent-child relationship", () => {
      const tree = new FamilyTree(
        [
          { id: 1, name: "Mother", gender: "f", generation: 1 },
          { id: 2, name: "Father", gender: "m", generation: 1 },
          { id: 3, name: "Child", gender: "f", conception: 10 },
        ],
        [{ id: 10, father: 2, birth: 20 }],
        [{ id: 20, mother: 1 }],
      )

      const stored = tree.serialize()

      expect(stored.people).toHaveLength(3)
      expect(stored.conceptions).toHaveLength(1)
      expect(stored.births).toHaveLength(1)

      const child = stored.people.find((p) => p.id === 3)!
      const conception = stored.conceptions[0]!
      const birth = stored.births[0]!

      expect(child.conception).toBe(conception.id)
      expect(conception.father).toBe(2)
      expect(conception.birth).toBe(birth.id)
      expect(birth.mother).toBe(1)
    })

    it("serializes a shared conception only once", () => {
      const tree = new FamilyTree(
        [
          { id: 1, gender: "f" },
          { id: 2, gender: "m" },
          { id: 3, gender: "f", conception: 10 },
          { id: 4, gender: "m", conception: 10 },
        ],
        [{ id: 10, father: 2, birth: 20 }],
        [{ id: 20, mother: 1 }],
      )

      const stored = tree.serialize()

      expect(stored.conceptions).toHaveLength(1)
      expect(stored.births).toHaveLength(1)

      expect(
        stored.people.filter((p) => p.conception === stored.conceptions[0]!.id),
      ).toHaveLength(2)
    })

    it("serializes a shared birth with multiple conceptions", () => {
      const tree = new FamilyTree(
        [
          { id: 1, gender: "f" },
          { id: 2, gender: "m" },
          { id: 3, gender: "m" },
          { id: 4, gender: "f", conception: 10 },
          { id: 5, gender: "m", conception: 11 },
        ],
        [
          { id: 10, father: 2, birth: 20 },
          { id: 11, father: 3, birth: 20 },
        ],
        [{ id: 20, mother: 1 }],
      )

      const stored = tree.serialize()

      expect(stored.conceptions).toHaveLength(2)
      expect(stored.births).toHaveLength(1)

      expect(stored.conceptions[0]!.birth).toBe(stored.conceptions[1]!.birth)
    })

    it("round-trips a tree without changing its genealogy", () => {
      const original = new FamilyTree(
        [
          { id: 1, name: "Grandmother", gender: "f", generation: 1 },
          { id: 2, name: "Grandfather", gender: "m", generation: 1 },
          { id: 3, name: "Mother", gender: "f", conception: 10 },
          { id: 4, name: "Father", gender: "m", generation: 1 },
          { id: 5, name: "Child A", gender: "f", conception: 11 },
          { id: 6, name: "Child B", gender: "m", conception: 11 },
        ],
        [
          { id: 10, father: 2, birth: 20 },
          { id: 11, father: 4, birth: 21 },
        ],
        [
          { id: 20, mother: 1 },
          { id: 21, mother: 3 },
        ],
      )

      const stored = original.serialize()
      const copy = new FamilyTree(
        stored.people,
        stored.conceptions,
        stored.births,
      )

      expect(copy.people.size).toBe(original.people.size)

      for (const [id, originalPerson] of original.people) {
        const copiedPerson = copy.people.get(id)!

        expect(copiedPerson.name).toBe(originalPerson.name)
        expect(copiedPerson.gender).toBe(originalPerson.gender)
        expect(copiedPerson.isHidden).toBe(originalPerson.isHidden)

        if (originalPerson.conception === undefined) {
          expect(copiedPerson.conception).toBeUndefined()
        } else {
          expect(copiedPerson.conception).toBeDefined()
          expect((copiedPerson.conception!.father as Person).id).toBe(
            (originalPerson.conception.father as Person).id,
          )
          expect((copiedPerson.conception!.birth.mother as Person).id).toBe(
            (originalPerson.conception.birth.mother as Person).id,
          )
        }
      }
    })
  })

  describe("copy construction", () => {
    it("copies the people into new Person objects", () => {
      const original = new FamilyTree(
        [
          { id: 1, name: "Alice", gender: "f" },
          { id: 2, name: "Bob", gender: "m" },
        ],
        [],
        [],
      )

      const copy = new FamilyTree(original)

      expect(copy).not.toBe(original)
      expect(copy.people).not.toBe(original.people)

      expect(copy.people.get(1)).not.toBe(original.people.get(1))
      expect(copy.people.get(2)).not.toBe(original.people.get(2))
    })

    it("preserves shared Conception and Birth references in the copy", () => {
      const original = new FamilyTree(
        [
          { id: 1, gender: "f" },
          { id: 2, gender: "m" },
          { id: 3, gender: "f", conception: 10 },
          { id: 4, gender: "m", conception: 10 },
        ],
        [{ id: 10, father: 2, birth: 20 }],
        [{ id: 20, mother: 1 }],
      )

      const copy = new FamilyTree(original)

      const twinA = copy.people.get(3)!
      const twinB = copy.people.get(4)!

      expect(twinA.conception).toBe(twinB.conception)
      expect(twinA.conception!.birth.mother).toBe(copy.people.get(1))
      expect(twinA.conception!.father).toBe(copy.people.get(2))

      // The copy should not retain references into the original tree.
      expect(twinA.conception).not.toBe(original.people.get(3)!.conception)
      expect(twinA.conception!.birth).not.toBe(
        original.people.get(3)!.conception!.birth,
      )
      expect(twinA.conception!.father).not.toBe(original.people.get(2))
      expect(twinA.conception!.birth.mother).not.toBe(original.people.get(1))
    })
  })

  describe("cyclic ancestry", () => {
    it("loads and preserves a complicated cyclic pedigree", () => {
      const storedPeople = [
        { id: "a", gender: "f", conception: "c1" },
        { id: "b", gender: "f", conception: "c2" },
        { id: "c", gender: "m", conception: "c3" },
        { id: "d", gender: "f", conception: "c4" },
        { id: "e", gender: "f", conception: "c4" },
        { id: "f", gender: "f", conception: "c5" },
      ] as const

      const storedConceptions = [
        { id: "c1", father: "d", birth: "b1" },
        { id: "c2", father: "a", birth: "b2" },
        { id: "c3", father: "a", birth: "b3" },
        { id: "c4", father: "c", birth: "b4" },
        { id: "c5", father: "e", birth: "b5" },
      ] as const

      const storedBirths = [
        { id: "b1", mother: "f" },
        { id: "b2", mother: "a" },
        { id: "b3", mother: "b" },
        { id: "b4", mother: "b" },
        { id: "b5", mother: "d" },
      ] as const

      const tree = new FamilyTree(
        [...storedPeople],
        [...storedConceptions],
        [...storedBirths],
      )

      expect(tree.people.size).toBe(6)

      const a = tree.people.get("a")!
      const b = tree.people.get("b")!
      const c = tree.people.get("c")!
      const d = tree.people.get("d")!
      const e = tree.people.get("e")!
      const f = tree.people.get("f")!

      // Verify the actual cycle rather than merely checking that construction
      // didn't throw.
      expect(a.conception!.father).toBe(d)
      expect(a.conception!.birth.mother).toBe(f)

      expect(b.conception!.father).toBe(a)
      expect(b.conception!.birth.mother).toBe(a)

      expect(c.conception!.father).toBe(a)
      expect(c.conception!.birth.mother).toBe(b)

      expect(d.conception!.father).toBe(c)
      expect(d.conception!.birth.mother).toBe(b)

      expect(e.conception!.father).toBe(c)
      expect(e.conception!.birth.mother).toBe(b)

      expect(f.conception!.father).toBe(e)
      expect(f.conception!.birth.mother).toBe(d)

      const serialized = tree.serialize()

      expect(serialized.people).toHaveLength(6)
      expect(serialized.conceptions).toHaveLength(5)
      expect(serialized.births).toHaveLength(5)

      // Loading the serialization must reconstruct the same cyclic topology.
      const reloaded = new FamilyTree(
        serialized.people,
        serialized.conceptions,
        serialized.births,
      )

      const reloadedA = reloaded.people.get("a")!
      const reloadedB = reloaded.people.get("b")!
      const reloadedC = reloaded.people.get("c")!
      const reloadedD = reloaded.people.get("d")!
      const reloadedE = reloaded.people.get("e")!
      const reloadedF = reloaded.people.get("f")!

      expect(reloadedA.conception!.father).toBe(reloadedD)
      expect(reloadedA.conception!.birth.mother).toBe(reloadedF)

      expect(reloadedB.conception!.father).toBe(reloadedA)
      expect(reloadedB.conception!.birth.mother).toBe(reloadedA)

      expect(reloadedC.conception!.father).toBe(reloadedA)
      expect(reloadedC.conception!.birth.mother).toBe(reloadedB)

      expect(reloadedD.conception!.father).toBe(reloadedC)
      expect(reloadedD.conception!.birth.mother).toBe(reloadedB)

      expect(reloadedE.conception!.father).toBe(reloadedC)
      expect(reloadedE.conception!.birth.mother).toBe(reloadedB)

      expect(reloadedF.conception!.father).toBe(reloadedE)
      expect(reloadedF.conception!.birth.mother).toBe(reloadedD)
    })
  })
})
