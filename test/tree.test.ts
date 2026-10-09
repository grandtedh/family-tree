import { describe, expect, it } from "vitest"

import { FamilyTree } from "@family-tree/family/tree"
import {
  FamilyTreeDuplicateIdError,
  FamilyTreeDuplicateStoredIdError,
  FamilyTreeError,
  FamilyTreeParentGenderError,
  FamilyTreeSelfingError,
  FamilyTreeUnrecognizedIdError,
  FamilyTreeUnrecognizedStoredIdError,
} from "@family-tree/family/errors"
import type { Person } from "@family-tree/family/person"
import type { FamilyTreeOptions } from "@family-tree/family/options"
import type { StoredTree } from "@family-tree/family/stored"

const options = (
  overrides: Partial<FamilyTreeOptions> = {},
): FamilyTreeOptions =>
  ({
    preventSelfing: false,
    enforceParentGender: false,
    ...overrides,
  }) as FamilyTreeOptions

function person(
  id: number,
  gender: "m" | "f" = "m",
  overrides: Partial<Omit<Person, "id" | "gender">> = {},
): Person {
  return {
    id,
    storedId: `stored-${id}`,
    gender,
    name: null,
    conception: null,
    generation: null,
    image: null,
    isHidden: false,
    ...overrides,
  }
}

function child(
  id: number,
  father: Person | symbol = Symbol("anonymous father"),
  mother: Person | symbol = Symbol("anonymous mother"),
  gender: "m" | "f" = "f",
): Person {
  return person(id, gender, { conception: { father, birth: { mother } } })
}

function treeOf(
  people: readonly Person[] = [],
  treeOptions: FamilyTreeOptions = options(),
): FamilyTree {
  const result = FamilyTree.make(people, treeOptions, [FamilyTreeError])
  if (result.success === false) {
    throw new Error(
      `Fixture tree was invalid: ${result.errors.map((error) => error.message).join("; ")}`,
    )
  }
  return result.tree
}

function errorsOf(result: {
  success: boolean
  errors?: FamilyTreeError[]
}): FamilyTreeError[] {
  expect(result.success).toBe(false)
  if (result.success || !result.errors) {
    throw new Error("Expected a failed FamilyTreeResult with errors")
  }
  return result.errors
}

function expectError<T extends FamilyTreeError>(
  errors: readonly FamilyTreeError[],
  type: abstract new (...args: never[]) => T,
): T {
  const match = errors.find((error) => error instanceof type)
  const expectedName = Reflect.get(type, "name") as string
  expect(
    match,
    `Expected ${expectedName} in ${errors.map((e) => e.constructor.name).join(", ")}`,
  ).toBeDefined()
  return match as T
}

function storedPerson(
  id: string,
  gender: "m" | "f" = "m",
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    gender,
    name: null,
    conception: undefined,
    generation: null,
    image: null,
    isHidden: false,
    ...overrides,
  }
}

function storedTree(
  people: unknown[] = [],
  conceptions: unknown[] = [],
  births: unknown[] = [],
): StoredTree {
  return { people, conceptions, births } as unknown as StoredTree
}

function expectSuccessfulTree(result: {
  success: boolean
  tree?: FamilyTree
}): FamilyTree {
  expect(result.success).toBe(true)
  if (!result.success || !result.tree) {
    throw new Error("Expected a successful FamilyTreeResult")
  }
  return result.tree
}

describe("FamilyTree.make / makeWithChecks", () => {
  it("creates a valid empty tree", () => {
    const treeOptions = options()
    const result = FamilyTree.make([], treeOptions, [FamilyTreeError])

    expect(result.success).toBe(true)
    const tree = expectSuccessfulTree(result)
    expect(tree.people.size).toBe(0)
    expect(tree.options).toBe(treeOptions)
  })

  it("preserves people order and indexes people by their numeric IDs", () => {
    const people = [person(7), person(2, "f"), person(13)]
    const tree = treeOf(people)

    expect([...tree.people.keys()]).toEqual([7, 2, 13])
    expect(tree.people.get(7)).toBe(people[0])
    expect(tree.people.get(2)).toBe(people[1])
    expect(tree.people.get(13)).toBe(people[2])
  })

  it("rejects duplicate person IDs", () => {
    const result = FamilyTree.make([person(1), person(1, "f")], options(), [
      FamilyTreeError,
    ])
    const errors = errorsOf(result)
    const error = expectError(errors, FamilyTreeDuplicateIdError)

    expect(error.id).toBe(1)
    expect(error.message).toBe('Duplicate person ID: "1"')
  })

  it("rejects duplicate stored IDs even when numeric IDs differ", () => {
    const first = person(1)
    const second = person(2, "f", { storedId: first.storedId })
    const errors = errorsOf(
      FamilyTree.make([first, second], options(), [FamilyTreeError]),
    )
    const error = expectError(errors, FamilyTreeDuplicateStoredIdError)

    expect(error.type).toBe("person")
    expect(error.storedId).toBe(first.storedId)
    expect(error.message).toBe(`Duplicate person ID: "${first.storedId}"`)
  })

  it("returns all validation errors instead of throwing in make", () => {
    const first = person(1)
    const second = person(1, "f", { storedId: first.storedId })
    const errors = errorsOf(
      FamilyTree.make([first, second], options(), [FamilyTreeError]),
    )

    expect(
      errors.filter((error) => error instanceof FamilyTreeDuplicateIdError),
    ).toHaveLength(1)
  })

  it("accepts known errors in make and returns them in the result", () => {
    const result = FamilyTree.make([person(1), person(1, "f")], options(), [
      FamilyTreeDuplicateIdError,
    ])

    expect(errorsOf(result)).toEqual([
      expect.objectContaining({ id: 1, message: 'Duplicate person ID: "1"' }),
    ])
  })

  it("throws when make encounters an error outside the allow-list", () => {
    expect(() =>
      FamilyTree.make([person(1), person(1, "f")], options(), [
        FamilyTreeDuplicateStoredIdError,
      ]),
    ).toThrow(FamilyTreeDuplicateIdError)
  })

  it("allows multiple expected error classes", () => {
    const first = person(1)
    const second = person(2, "f", { storedId: first.storedId })
    const result = FamilyTree.make([first, second], options(), [
      FamilyTreeDuplicateIdError,
      FamilyTreeDuplicateStoredIdError,
    ])

    expect(errorsOf(result)).toHaveLength(1)
    expect(errorsOf(result)[0]).toBeInstanceOf(FamilyTreeDuplicateStoredIdError)
  })
})

describe("FamilyTree.checkValidity", () => {
  it("returns no errors for independent founders", () => {
    expect(
      FamilyTree.checkValidity([person(1), person(2, "f")], options()),
    ).toEqual([])
  })

  it("requires a non-anonymous father reference to point to the exact person object in the tree", () => {
    const listedFather = person(1, "m")
    const detachedFather = person(1, "m")
    const childPerson = child(2, detachedFather)
    const errors = FamilyTree.checkValidity(
      [listedFather, childPerson],
      options(),
    )

    const error = expectError(errors, FamilyTreeUnrecognizedIdError)
    expect(error.id).toBe(1)
  })

  it("rejects a male person in the mother role regardless of options", () => {
    const mother = person(1, "m")
    const childPerson = child(2, Symbol("anonymous father"), mother)
    const errors = FamilyTree.checkValidity([mother, childPerson], options())
    const error = expectError(errors, FamilyTreeParentGenderError)

    expect(error.parent).toBe(mother)
    expect(error.role).toBe("mother")
  })

  it("checks father gender only when enforceParentGender is enabled", () => {
    const father = person(1, "f")
    const childPerson = child(2, father)

    expect(FamilyTree.checkValidity([father, childPerson], options())).toEqual(
      [],
    )
    const error = expectError(
      FamilyTree.checkValidity(
        [father, childPerson],
        options({ enforceParentGender: true }),
      ),
      FamilyTreeParentGenderError,
    )
    expect(error.parent).toBe(father)
    expect(error.role).toBe("father")
  })

  it("requires a non-anonymous mother reference to point to the exact person object in the tree", () => {
    const listedMother = person(1, "f")
    const detachedMother = person(1, "f")
    const childPerson = child(2, Symbol("anonymous father"), detachedMother)
    const errors = FamilyTree.checkValidity(
      [listedMother, childPerson],
      options(),
    )

    const error = expectError(errors, FamilyTreeUnrecognizedIdError)
    expect(error.id).toBe(1)
  })

  it("rejects a shared father and mother only when preventSelfing is enabled", () => {
    const sharedParent = person(1, "f")
    const childPerson = child(2, sharedParent, sharedParent)

    expect(
      FamilyTree.checkValidity(
        [sharedParent, childPerson],
        options({ preventSelfing: false }),
      ),
    ).toEqual([])
    const error = expectError(
      FamilyTree.checkValidity(
        [sharedParent, childPerson],
        options({ preventSelfing: true }),
      ),
      FamilyTreeSelfingError,
    )
    expect(error.parent).toBe(sharedParent)
    expect(error.person).toBe(childPerson)
  })

  it("can report more than one issue on the same family member", () => {
    const sharedParent = person(1, "f")
    const childPerson = child(2, sharedParent, sharedParent)
    const errors = FamilyTree.checkValidity(
      [sharedParent, childPerson],
      options({ enforceParentGender: true, preventSelfing: true }),
    )

    expect(
      errors.some((error) => error instanceof FamilyTreeParentGenderError),
    ).toBe(true)
    expect(
      errors.some((error) => error instanceof FamilyTreeSelfingError),
    ).toBe(true)
  })

  it.todo("detects cyclic ancestry")
})

describe("FamilyTree.copy", () => {
  it("copies the map and all person objects", () => {
    const people = [person(1), person(2, "f"), child(3)]
    const tree = treeOf(people)
    const copy = tree.copy()

    expect(copy).not.toBe(tree.people)
    expect([...copy.keys()]).toEqual([1, 2, 3])
    for (const source of people) {
      expect(copy.get(source.id)).not.toBe(source)
      expect(copy.get(source.id)).toEqual(source)
    }
  })

  it("rewires parent references to the copied person instances", () => {
    const father = person(1, "m")
    const mother = person(2, "f")
    const descendant = child(3, father, mother)
    const copy = treeOf([father, mother, descendant]).copy()
    const copiedChild = copy.get(3)!

    expect(copiedChild.conception?.father).toBe(copy.get(1))
    expect(copiedChild.conception?.birth.mother).toBe(copy.get(2))
    expect(copiedChild.conception?.father).not.toBe(father)
    expect(copiedChild.conception?.birth.mother).not.toBe(mother)
  })

  it("preserves anonymous-parent symbols", () => {
    const father = Symbol("unknown father")
    const mother = Symbol("unknown mother")
    const descendant = child(1, father, mother)
    const copy = treeOf([descendant]).copy()

    expect(copy.get(1)?.conception?.father).toBe(father)
    expect(copy.get(1)?.conception?.birth.mother).toBe(mother)
  })

  it("preserves shared conception identity for identical twins", () => {
    const twinA = child(1)
    const twinB = child(2)
    twinB.conception = twinA.conception
    const copy = treeOf([twinA, twinB]).copy()

    expect(copy.get(1)?.conception).toBe(copy.get(2)?.conception)
  })

  it("preserves shared birth identity but distinct conceptions for fraternal twins", () => {
    const mother = person(1, "f")
    const twinA = child(2, Symbol("father A"), mother)
    const twinB = child(3, Symbol("father B"), mother)
    twinB.conception!.birth = twinA.conception!.birth
    const copy = treeOf([mother, twinA, twinB]).copy()

    expect(copy.get(2)?.conception).not.toBe(copy.get(3)?.conception)
    expect(copy.get(2)?.conception?.birth).toBe(copy.get(3)?.conception?.birth)
    expect(copy.get(2)?.conception?.birth.mother).toBe(copy.get(1))
  })
})

describe("FamilyTree.addPerson", () => {
  it("adds a new founder using the next numeric ID", () => {
    const tree = treeOf([person(1), person(4, "f")])
    const added = expectSuccessfulTree(tree.addPerson("new-person"))
    const created = added.people.get(5)

    expect(created).toMatchObject({
      id: 5,
      storedId: "new-person",
      gender: "m",
      name: null,
      conception: null,
      generation: null,
      image: null,
      isHidden: false,
    })
    expect(tree.people.has(5)).toBe(false)
  })

  it("returns a duplicate-stored-ID error without changing the original tree", () => {
    const tree = treeOf([person(1)])
    const errors = errorsOf(tree.addPerson("stored-1"))
    const error = expectError(errors, FamilyTreeDuplicateStoredIdError)

    expect(error.type).toBe("person")
    expect(error.storedId).toBe("stored-1")
    expect(tree.people.size).toBe(1)
  })

  it("can add the first person to an empty tree", () => {
    const added = expectSuccessfulTree(treeOf().addPerson("first"))

    expect([...added.people.keys()]).toEqual([0])
    expect(added.people.get(0)?.storedId).toBe("first")
  })
})

describe("FamilyTree.setFather", () => {
  it("sets a father on a person without a conception", () => {
    const father = person(1, "m")
    const tree = treeOf([father, person(2, "f")])
    const updated = expectSuccessfulTree(tree.setFather(2, 1))
    const conception = updated.people.get(2)?.conception

    expect(conception?.father).toBe(updated.people.get(1))
    expect(typeof conception?.birth.mother).toBe("symbol")
    expect(tree.people.get(2)?.conception).toBeNull()
  })

  it("replaces a known father", () => {
    const fatherA = person(1, "m")
    const fatherB = person(2, "m")
    const descendant = child(3, fatherA)
    const updated = expectSuccessfulTree(
      treeOf([fatherA, fatherB, descendant]).setFather(3, 2),
    )

    expect(updated.people.get(3)?.conception?.father).toBe(
      updated.people.get(2),
    )
  })

  it("sets an anonymous father when passed null", () => {
    const father = person(1, "m")
    const descendant = child(2, father)
    const updated = expectSuccessfulTree(
      treeOf([father, descendant]).setFather(2, null),
    )

    expect(typeof updated.people.get(2)?.conception?.father).toBe("symbol")
  })

  it("returns an unrecognized-ID error for a missing child", () => {
    const errors = errorsOf(treeOf([person(1)]).setFather(99, 1))
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })

  it("returns an unrecognized-ID error for a missing father", () => {
    const tree = treeOf([person(1)])
    const errors = errorsOf(tree.setFather(1, 99))

    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
    expect(tree.people.get(1)?.conception).toBeNull()
  })

  it("rejects a father whose gender is female when enforcement is enabled", () => {
    const tree = treeOf(
      [person(1, "f"), person(2, "f")],
      options({ enforceParentGender: true }),
    )
    const errors = errorsOf(tree.setFather(2, 1))
    const error = expectError(errors, FamilyTreeParentGenderError)

    expect(error.parent.id).toBe(1)
    expect(error.role).toBe("father")
    expect(tree.people.get(2)?.conception).toBeNull()
  })

  it("allows a female father-role reference when father-gender enforcement is disabled", () => {
    const tree = treeOf(
      [person(1, "m"), person(2, "f")],
      options({ enforceParentGender: false }),
    )
    const updated = expectSuccessfulTree(tree.setFather(1, 2))

    expect(updated.people.get(1)?.conception?.father).toBe(
      updated.people.get(2),
    )
  })

  it("rejects selfing when the new father is already the mother and preventSelfing is enabled", () => {
    const parent = person(1, "f")
    const descendant = child(2, Symbol("unknown father"), parent)
    const tree = treeOf([parent, descendant], options({ preventSelfing: true }))
    const errors = errorsOf(tree.setFather(2, 1))

    const error = expectError(errors, FamilyTreeSelfingError)
    expect(error.parent.id).toBe(1)
    expect(error.person.id).toBe(2)
  })
})

describe("FamilyTree.setMother", () => {
  it("sets a mother on a person without a conception", () => {
    const mother = person(1, "f")
    const tree = treeOf([mother, person(2, "m")])
    const updated = expectSuccessfulTree(tree.setMother(2, 1))

    expect(updated.people.get(2)?.conception?.birth.mother).toBe(
      updated.people.get(1),
    )
    expect(typeof updated.people.get(2)?.conception?.father).toBe("symbol")
    expect(tree.people.get(2)?.conception).toBeNull()
  })

  it("replaces a known mother", () => {
    const motherA = person(1, "f")
    const motherB = person(2, "f")
    const descendant = child(3, Symbol("father"), motherA)
    const updated = expectSuccessfulTree(
      treeOf([motherA, motherB, descendant]).setMother(3, 2),
    )

    expect(updated.people.get(3)?.conception?.birth.mother).toBe(
      updated.people.get(2),
    )
  })

  it("sets an anonymous mother when passed null", () => {
    const mother = person(1, "f")
    const descendant = child(2, Symbol("father"), mother)
    const updated = expectSuccessfulTree(
      treeOf([mother, descendant]).setMother(2, null),
    )

    expect(typeof updated.people.get(2)?.conception?.birth.mother).toBe(
      "symbol",
    )
  })

  it("returns an unrecognized-ID error for a missing child", () => {
    const errors = errorsOf(treeOf([person(1, "f")]).setMother(99, 1))
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })

  it("returns an unrecognized-ID error for a missing mother", () => {
    const tree = treeOf([person(1)])
    const errors = errorsOf(tree.setMother(1, 99))

    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
    expect(tree.people.get(1)?.conception).toBeNull()
  })

  it("rejects a mother whose gender is male", () => {
    const tree = treeOf(
      [person(1, "m"), person(2, "f")],
      options({ enforceParentGender: true }),
    )
    const errors = errorsOf(tree.setMother(2, 1))
    const error = expectError(errors, FamilyTreeParentGenderError)

    expect(error.parent.id).toBe(1)
    expect(error.role).toBe("mother")
    expect(tree.people.get(2)?.conception).toBeNull()
  })

  it("rejects selfing when the new mother is already the father and preventSelfing is enabled", () => {
    const parent = person(1, "m")
    const descendant = child(2, parent, Symbol("unknown mother"))
    const tree = treeOf([parent, descendant], options({ preventSelfing: true }))
    const errors = errorsOf(tree.setMother(2, 1))

    const error = expectError(errors, FamilyTreeSelfingError)
    expect(error.parent.id).toBe(1)
    expect(error.person.id).toBe(2)
  })
})

describe("FamilyTree.makeFounder", () => {
  it("removes the person's conception and parent links", () => {
    const father = person(1, "m")
    const mother = person(2, "f")
    const descendant = child(3, father, mother)
    const tree = treeOf([father, mother, descendant])
    const updated = expectSuccessfulTree(tree.makeFounder(3))

    expect(updated.people.get(3)?.conception).toBeNull()
    expect(tree.people.get(3)?.conception).not.toBeNull()
  })

  it("returns an unrecognized-ID error for an unknown person", () => {
    const errors = errorsOf(treeOf([person(1)]).makeFounder(99))
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })
})

describe("FamilyTree.makeTwin", () => {
  it.each(["identical", "fraternal"] as const)(
    "makes %s twins sharing the intended conception/birth structure",
    (type) => {
      const mother = person(1, "f")
      const father = person(2, "m")
      const twinA = child(3, father, mother)
      const twinB = child(4)
      const updated = expectSuccessfulTree(
        treeOf([mother, father, twinA, twinB]).makeTwin(3, 4, type, "theirs"),
      )
      const first = updated.people.get(3)!
      const second = updated.people.get(4)!

      expect(first.conception).not.toBeNull()
      expect(second.conception).not.toBeNull()
      expect(second.conception?.birth.mother).toBe(updated.people.get(1))
      if (type === "identical") {
        expect(second.conception).toBe(first.conception)
      } else {
        expect(second.conception).not.toBe(first.conception)
        expect(second.conception?.birth).toBe(first.conception?.birth)
      }
    },
  )

  it("uses the target twin's parents when parentsToChange is ours", () => {
    const fatherA = person(1, "m")
    const motherA = person(2, "f")
    const fatherB = person(3, "m")
    const motherB = person(4, "f")
    const first = child(5, fatherA, motherA)
    const second = child(6, fatherB, motherB)
    const updated = expectSuccessfulTree(
      treeOf([fatherA, motherA, fatherB, motherB, first, second]).makeTwin(
        5,
        6,
        "identical",
        "ours",
      ),
    )

    expect(updated.people.get(5)?.conception).toBe(
      updated.people.get(6)?.conception,
    )
    expect(updated.people.get(5)?.conception?.father).toBe(
      updated.people.get(3),
    )
    expect(updated.people.get(5)?.conception?.birth.mother).toBe(
      updated.people.get(4),
    )
  })

  it("supports making twins when the source is a founder", () => {
    const tree = treeOf([person(1), person(2)])
    const updated = expectSuccessfulTree(
      tree.makeTwin(1, 2, "identical", "theirs"),
    )

    expect(updated.people.get(1)?.conception).toBe(
      updated.people.get(2)?.conception,
    )
    expect(updated.people.get(1)?.conception).not.toBeNull()
  })

  it("returns an error when the first person is missing", () => {
    const errors = errorsOf(
      treeOf([person(1)]).makeTwin(99, 1, "identical", "ours"),
    )
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })

  it("returns an error when the twin is missing", () => {
    const errors = errorsOf(
      treeOf([person(1)]).makeTwin(1, 99, "fraternal", "theirs"),
    )
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })
})

describe("FamilyTree.clearTwins", () => {
  it("is a no-op for a founder with no conception", () => {
    const tree = treeOf([person(1)])
    const updated = expectSuccessfulTree(tree.clearTwins(1, "all"))

    expect(updated.people.get(1)?.conception).toBeNull()
  })

  it("breaks a fraternal-twin birth link while preserving each twin's conception", () => {
    const mother = person(1, "f")
    const first = child(2, Symbol("father 1"), mother)
    const second = child(3, Symbol("father 2"), mother)
    second.conception!.birth = first.conception!.birth
    const tree = treeOf([mother, first, second])
    const updated = expectSuccessfulTree(tree.clearTwins(2, "fraternal"))

    expect(updated.people.get(2)?.conception).not.toBeNull()
    expect(updated.people.get(2)?.conception).not.toBe(
      updated.people.get(3)?.conception,
    )
    expect(updated.people.get(2)?.conception?.birth).not.toBe(
      updated.people.get(3)?.conception?.birth,
    )
    expect(updated.people.get(2)?.conception?.birth.mother).toBe(
      updated.people.get(1),
    )
    expect(updated.people.get(2)?.conception?.father).not.toBe(
      updated.people.get(3)?.conception?.father,
    )
  })

  it("breaks an identical-twin conception link for type all while retaining each parent reference", () => {
    const father = person(1, "m")
    const mother = person(2, "f")
    const first = child(3, father, mother)
    const second = child(4, father, mother)
    second.conception = first.conception
    const tree = treeOf([father, mother, first, second])
    const updated = expectSuccessfulTree(tree.clearTwins(3, "all"))

    expect(updated.people.get(3)?.conception).not.toBe(
      updated.people.get(4)?.conception,
    )
    expect(updated.people.get(3)?.conception?.father).toBe(
      updated.people.get(1),
    )
    expect(updated.people.get(3)?.conception?.birth.mother).toBe(
      updated.people.get(2),
    )
  })

  it("returns an error when the person is unknown", () => {
    const errors = errorsOf(treeOf().clearTwins(99, "fraternal"))
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })
})

describe("FamilyTree.deletePerson", () => {
  it("removes a person from the returned tree", () => {
    const tree = treeOf([person(1), person(2, "f")])
    const updated = expectSuccessfulTree(tree.deletePerson(1))

    expect(updated.people.has(1)).toBe(false)
    expect(updated.people.has(2)).toBe(true)
    expect(tree.people.has(1)).toBe(true)
  })

  it("replaces deleted father references with anonymous symbols", () => {
    const father = person(1, "m")
    const descendant = child(2, father)
    const updated = expectSuccessfulTree(
      treeOf([father, descendant]).deletePerson(1),
    )

    expect(typeof updated.people.get(2)?.conception?.father).toBe("symbol")
  })

  it("replaces deleted mother references with anonymous symbols", () => {
    const mother = person(1, "f")
    const descendant = child(2, Symbol("father"), mother)
    const updated = expectSuccessfulTree(
      treeOf([mother, descendant]).deletePerson(1),
    )

    expect(typeof updated.people.get(2)?.conception?.birth.mother).toBe(
      "symbol",
    )
  })

  it("clears both parental references when the same person occupies both roles", () => {
    const sharedParent = person(1, "f")
    const descendant = child(2, sharedParent, sharedParent)
    const updated = expectSuccessfulTree(
      treeOf([sharedParent, descendant]).deletePerson(1),
    )

    expect(typeof updated.people.get(2)?.conception?.father).toBe("symbol")
    expect(typeof updated.people.get(2)?.conception?.birth.mother).toBe(
      "symbol",
    )
  })

  it("returns an error when the person is unknown", () => {
    const tree = treeOf([person(1)])
    const errors = errorsOf(tree.deletePerson(99))

    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
    expect(tree.people.size).toBe(1)
  })
})

describe("FamilyTree.setStoredId", () => {
  it("updates a person's stored ID without changing their numeric ID", () => {
    const tree = treeOf([person(1)])
    const updated = expectSuccessfulTree(tree.setStoredId(1, "renamed"))

    expect(updated.people.get(1)?.storedId).toBe("renamed")
    expect(updated.people.has(1)).toBe(true)
    expect(tree.people.get(1)?.storedId).toBe("stored-1")
  })

  it("rejects a duplicate stored ID", () => {
    const tree = treeOf([person(1), person(2)])
    const errors = errorsOf(tree.setStoredId(2, "stored-1"))
    const error = expectError(errors, FamilyTreeDuplicateStoredIdError)

    expect(error.type).toBe("person")
    expect(error.storedId).toBe("stored-1")
    expect(tree.people.get(2)?.storedId).toBe("stored-2")
  })

  it("returns an unrecognized-ID error when the person is missing", () => {
    const errors = errorsOf(treeOf([person(1)]).setStoredId(99, "renamed"))
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })
})

describe("FamilyTree.setGender", () => {
  it("updates gender for a person who is not a parent", () => {
    const tree = treeOf([person(1)])
    const updated = expectSuccessfulTree(tree.setGender(1, "f"))

    expect(updated.people.get(1)?.gender).toBe("f")
    expect(tree.people.get(1)?.gender).toBe("m")
  })

  it("clears father references when a father becomes female and parent-gender enforcement is enabled", () => {
    const father = person(1, "m")
    const childA = child(2, father)
    const childB = child(3, father)
    const tree = treeOf(
      [father, childA, childB],
      options({ enforceParentGender: true }),
    )

    const updated = expectSuccessfulTree(tree.setGender(1, "f"))

    expect(updated.people.get(1)?.gender).toBe("f")
    expect(typeof updated.people.get(2)?.conception?.father).toBe("symbol")
    expect(typeof updated.people.get(3)?.conception?.father).toBe("symbol")
    // The operation is copy-on-write: the original tree keeps its old references.
    expect(tree.people.get(2)?.conception?.father).toBe(tree.people.get(1))
    expect(tree.people.get(3)?.conception?.father).toBe(tree.people.get(1))
  })

  it("retains a female father reference when parent-gender enforcement is disabled", () => {
    const father = person(1, "m")
    const descendant = child(2, father)
    const tree = treeOf(
      [father, descendant],
      options({ enforceParentGender: false }),
    )

    const updated = expectSuccessfulTree(tree.setGender(1, "f"))

    expect(updated.people.get(1)?.gender).toBe("f")
    expect(updated.people.get(2)?.conception?.father).toBe(
      updated.people.get(1),
    )
    expect(tree.people.get(1)?.gender).toBe("m")
  })

  it("clears mother references whenever a mother becomes male, even with enforcement disabled", () => {
    const mother = person(1, "f")
    const sharedBirth = { mother }
    const childA = person(2, "f", {
      conception: { father: Symbol("anonymous father"), birth: sharedBirth },
    })
    const childB = person(3, "m", {
      conception: { father: Symbol("anonymous father"), birth: sharedBirth },
    })
    const tree = treeOf(
      [mother, childA, childB],
      options({ enforceParentGender: false }),
    )

    const updated = expectSuccessfulTree(tree.setGender(1, "m"))

    expect(updated.people.get(1)?.gender).toBe("m")
    expect(typeof updated.people.get(2)?.conception?.birth.mother).toBe(
      "symbol",
    )
    expect(typeof updated.people.get(3)?.conception?.birth.mother).toBe(
      "symbol",
    )
    expect(tree.people.get(2)?.conception?.birth.mother).toBe(
      tree.people.get(1),
    )
    expect(tree.people.get(3)?.conception?.birth.mother).toBe(
      tree.people.get(1),
    )
  })

  it("allows a father-role gender change when enforcement is disabled", () => {
    const father = person(1, "m")
    const descendant = child(2, father)
    const tree = treeOf(
      [father, descendant],
      options({ enforceParentGender: false }),
    )
    const updated = expectSuccessfulTree(tree.setGender(1, "f"))

    expect(updated.people.get(1)?.gender).toBe("f")
  })

  it("returns an unrecognized-ID error when the person is missing", () => {
    const errors = errorsOf(treeOf().setGender(99, "f"))
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })
})

describe("FamilyTree.setAttribute", () => {
  it("sets name", () => {
    const tree = treeOf([person(1)])
    const updated = expectSuccessfulTree(tree.setAttribute(1, "name", "Ada"))

    expect(updated.people.get(1)?.name).toBe("Ada")
    expect(tree.people.get(1)?.name).toBeNull()
  })

  it("sets generation", () => {
    const tree = treeOf([person(1)])
    const generation = 3 as Person["generation"]
    const updated = expectSuccessfulTree(
      tree.setAttribute(1, "generation", generation),
    )

    expect(updated.people.get(1)?.generation).toBe(generation)
  })

  it("sets image", () => {
    const tree = treeOf([person(1)])
    const image = "avatar.png" as Person["image"]
    const updated = expectSuccessfulTree(tree.setAttribute(1, "image", image))

    expect(updated.people.get(1)?.image).toBe(image)
  })

  it("sets isHidden", () => {
    const tree = treeOf([person(1)])
    const updated = expectSuccessfulTree(tree.setAttribute(1, "isHidden", true))

    expect(updated.people.get(1)?.isHidden).toBe(true)
  })

  it("returns an unrecognized-ID error when the person is missing", () => {
    const errors = errorsOf(treeOf().setAttribute(99, "name", "Nobody"))
    expect(expectError(errors, FamilyTreeUnrecognizedIdError).id).toBe(99)
  })
})

describe("FamilyTree.serialize", () => {
  it("serializes an empty tree to empty arrays", () => {
    expect(treeOf().serialize()).toEqual({
      people: [],
      conceptions: [],
      births: [],
    })
  })

  it("serializes a founder without emitting a conception or birth record", () => {
    const founder = person(1, "f", {
      name: "Founder",
      generation: null,
      image: null,
    })
    expect(treeOf([founder]).serialize()).toEqual({
      people: [
        {
          id: "stored-1",
          gender: "f",
          name: "Founder",
          conception: undefined,
          generation: null,
          image: null,
          isHidden: undefined,
        },
      ],
      conceptions: [],
      births: [],
    })
  })

  it("serializes anonymous parents as null stored IDs", () => {
    const descendant = person(1, "f", {
      conception: {
        father: Symbol("anonymous father"),
        birth: { mother: Symbol("anonymous mother") },
      },
    })
    const stored = treeOf([descendant]).serialize()

    expect(stored.births).toEqual([{ id: "birth-0", mother: null }])
    expect(stored.conceptions).toEqual([
      { id: "conception-0", birth: "birth-0", father: null },
    ])
    expect(stored.people[0]).toMatchObject({
      id: "stored-1",
      conception: "conception-0",
    })
  })

  it("serializes real parents using their stored IDs", () => {
    const father = person(1, "m", { storedId: "dad" })
    const mother = person(2, "f", { storedId: "mom" })
    const descendant = child(3, father, mother)
    const stored = treeOf([father, mother, descendant]).serialize()

    expect(stored.births).toEqual([{ id: "birth-0", mother: "mom" }])
    expect(stored.conceptions).toEqual([
      { id: "conception-0", birth: "birth-0", father: "dad" },
    ])
    expect(stored.people[2]).toMatchObject({
      id: "stored-3",
      conception: "conception-0",
    })
  })

  it("deduplicates shared conception and birth records for identical twins", () => {
    const mother = person(1, "f")
    const father = person(2, "m")
    const first = child(3, father, mother)
    const second = child(4, father, mother)
    second.conception = first.conception
    const stored = treeOf([mother, father, first, second]).serialize()

    expect(stored.births).toHaveLength(1)
    expect(stored.conceptions).toHaveLength(1)
    expect(stored.people[2]?.conception).toBe(stored.people[3]?.conception)
  })

  it("deduplicates birth but not conception records for fraternal twins", () => {
    const mother = person(1, "f")
    const first = child(2, Symbol("father 1"), mother)
    const second = child(3, Symbol("father 2"), mother)
    second.conception!.birth = first.conception!.birth
    const stored = treeOf([mother, first, second]).serialize()

    expect(stored.births).toHaveLength(1)
    expect(stored.conceptions).toHaveLength(2)
    expect(stored.conceptions[0]?.birth).toBe(stored.conceptions[1]?.birth)
    expect(stored.people[1]?.conception).not.toBe(stored.people[2]?.conception)
  })

  it("serializes hidden state only when true", () => {
    const visible = person(1)
    const hidden = person(2, "f", { isHidden: true })
    const stored = treeOf([visible, hidden]).serialize()

    expect(stored.people[0]?.isHidden).toBeUndefined()
    expect(stored.people[1]?.isHidden).toBe(true)
  })
})

describe("FamilyTree.fromStored", () => {
  it("loads founders and supplies defaults for omitted nullable attributes", () => {
    const stored = storedTree([
      storedPerson("p1", "m", {
        name: undefined,
        generation: undefined,
        image: undefined,
        isHidden: undefined,
      }),
    ])
    const tree = expectSuccessfulTree(FamilyTree.fromStored(stored, options()))

    expect([...tree.people.keys()]).toEqual([0])
    expect(tree.people.get(0)).toMatchObject({
      id: 0,
      storedId: "p1",
      gender: "m",
      name: null,
      conception: null,
      generation: null,
      image: null,
      isHidden: false,
    })
  })

  it("assigns consecutive internal IDs in stored-person order", () => {
    const stored = storedTree([
      storedPerson("last", "f"),
      storedPerson("first", "m"),
    ])
    const tree = expectSuccessfulTree(FamilyTree.fromStored(stored, options()))

    expect(
      [...tree.people.entries()].map(([id, value]) => [id, value.storedId]),
    ).toEqual([
      [0, "last"],
      [1, "first"],
    ])
  })

  it("reconstructs father and mother object references", () => {
    const stored = storedTree(
      [
        storedPerson("dad", "m"),
        storedPerson("mom", "f"),
        storedPerson("child", "f", { conception: "c1" }),
      ],
      [{ id: "c1", birth: "b1", father: "dad" }],
      [{ id: "b1", mother: "mom" }],
    )
    const tree = expectSuccessfulTree(
      FamilyTree.fromStored(stored, options({ enforceParentGender: true })),
    )
    const descendant = tree.people.get(2)!

    expect(descendant.conception?.father).toBe(tree.people.get(0))
    expect(descendant.conception?.birth.mother).toBe(tree.people.get(1))
  })

  it("reconstructs anonymous parents from null stored IDs", () => {
    const stored = storedTree(
      [storedPerson("child", "f", { conception: "c1" })],
      [{ id: "c1", birth: "b1", father: null }],
      [{ id: "b1", mother: null }],
    )
    const tree = expectSuccessfulTree(FamilyTree.fromStored(stored, options()))

    expect(typeof tree.people.get(0)?.conception?.father).toBe("symbol")
    expect(typeof tree.people.get(0)?.conception?.birth.mother).toBe("symbol")
  })

  it("preserves shared conception identity for stored identical twins", () => {
    const stored = storedTree(
      [
        storedPerson("dad", "m"),
        storedPerson("mom", "f"),
        storedPerson("twin-a", "f", { conception: "c1" }),
        storedPerson("twin-b", "m", { conception: "c1" }),
      ],
      [{ id: "c1", birth: "b1", father: "dad" }],
      [{ id: "b1", mother: "mom" }],
    )
    const tree = expectSuccessfulTree(FamilyTree.fromStored(stored, options()))

    expect(tree.people.get(2)?.conception).toBe(tree.people.get(3)?.conception)
  })

  it("round-trips a valid tree through serialize and fromStored", () => {
    const father = person(1, "m", { name: "Dad", storedId: "dad" })
    const mother = person(2, "f", {
      name: "Mom",
      storedId: "mom",
      isHidden: true,
    })
    const descendant = child(3, father, mother, "f")
    descendant.name = "Child"
    const original = treeOf(
      [father, mother, descendant],
      options({ enforceParentGender: true }),
    )
    const restored = expectSuccessfulTree(
      FamilyTree.fromStored(original.serialize(), original.options),
    )

    expect(restored.serialize()).toEqual(original.serialize())
  })

  it("reports duplicate stored person IDs", () => {
    const stored = storedTree([storedPerson("same"), storedPerson("same", "f")])
    const errors = errorsOf(FamilyTree.fromStored(stored, options()))
    const error = expectError(errors, FamilyTreeDuplicateStoredIdError)

    expect(error.type).toBe("person")
    expect(error.storedId).toBe("same")
  })

  it("reports duplicate stored birth IDs", () => {
    const stored = storedTree(
      [storedPerson("p1")],
      [],
      [
        { id: "b1", mother: null },
        { id: "b1", mother: null },
      ],
    )
    const errors = errorsOf(FamilyTree.fromStored(stored, options()))
    const error = expectError(errors, FamilyTreeDuplicateStoredIdError)

    expect(error.type).toBe("birth")
    expect(error.storedId).toBe("b1")
  })

  it("reports duplicate stored conception IDs", () => {
    const stored = storedTree(
      [storedPerson("p1")],
      [
        { id: "c1", birth: "b1", father: null },
        { id: "c1", birth: "b1", father: null },
      ],
      [{ id: "b1", mother: null }],
    )
    const errors = errorsOf(FamilyTree.fromStored(stored, options()))
    const error = expectError(errors, FamilyTreeDuplicateStoredIdError)

    expect(error.type).toBe("conception")
    expect(error.storedId).toBe("c1")
  })

  it("reports a birth that references an unknown mother", () => {
    const stored = storedTree(
      [storedPerson("child", "f", { conception: "c1" })],
      [{ id: "c1", birth: "b1", father: null }],
      [{ id: "b1", mother: "missing-person" }],
    )
    const errors = errorsOf(FamilyTree.fromStored(stored, options()))
    const error = expectError(errors, FamilyTreeUnrecognizedStoredIdError)

    expect(error.foundInType).toBe("birth")
    expect(error.foundInStoredId).toBe("b1")
    expect(error.expectedType).toBe("person")
    expect(error.storedId).toBe("missing-person")
  })

  it("reports a conception that references an unknown father", () => {
    const stored = storedTree(
      [storedPerson("child", "f", { conception: "c1" })],
      [{ id: "c1", birth: "b1", father: "missing-person" }],
      [{ id: "b1", mother: null }],
    )
    const errors = errorsOf(FamilyTree.fromStored(stored, options()))
    const error = expectError(errors, FamilyTreeUnrecognizedStoredIdError)

    expect(error.foundInType).toBe("conception")
    expect(error.foundInStoredId).toBe("c1")
    expect(error.expectedType).toBe("person")
    expect(error.storedId).toBe("missing-person")
  })

  it("reports a conception that references an unknown birth", () => {
    const stored = storedTree(
      [storedPerson("child", "f", { conception: "c1" })],
      [{ id: "c1", birth: "missing-birth", father: null }],
      [],
    )
    const errors = errorsOf(FamilyTree.fromStored(stored, options()))
    const error = expectError(errors, FamilyTreeUnrecognizedStoredIdError)

    expect(error.foundInType).toBe("conception")
    expect(error.foundInStoredId).toBe("c1")
    expect(error.expectedType).toBe("birth")
    expect(error.storedId).toBe("missing-birth")
  })

  it("reports a person that references an unknown conception", () => {
    const stored = storedTree([
      storedPerson("child", "f", { conception: "missing-conception" }),
    ])
    const errors = errorsOf(FamilyTree.fromStored(stored, options()))
    const error = expectError(errors, FamilyTreeUnrecognizedStoredIdError)

    expect(error.foundInType).toBe("person")
    expect(error.foundInStoredId).toBe("child")
    expect(error.expectedType).toBe("conception")
    expect(error.storedId).toBe("missing-conception")
  })
})
