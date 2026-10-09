import {
  type StoredPerson,
  type StoredConception,
  type StoredBirth,
  StorageId,
  StoredTree,
} from "@family-tree/family/stored"
import { type Person, type ReadonlyPerson } from "@family-tree/family/person"
import { type Birth } from "@family-tree/family/birth"
import { type Conception } from "@family-tree/family/conception"
import {
  checkAllowedErrors as checkExpectedErrors,
  FamilyTreeCyclicAncestryError,
  FamilyTreeDuplicateIdError,
  FamilyTreeDuplicateStoredIdError,
  FamilyTreeError,
  FamilyTreeParentGenderError,
  FamilyTreeSelfingError,
  FamilyTreeUnrecognizedIdError,
  FamilyTreeUnrecognizedStoredIdError,
  type Constructor,
} from "@family-tree/family/errors"
import type { FamilyTreeOptions } from "@family-tree/family/options"
import type { FamilyTreeResult } from "@family-tree/family/result"

export class FamilyTree {
  #people: Map<number, Person>
  readonly options: Readonly<FamilyTreeOptions>

  get people(): ReadonlyMap<number, ReadonlyPerson> {
    return this.#people
  }

  private constructor(
    people: Map<number, Person>,
    options: Readonly<FamilyTreeOptions>,
  ) {
    this.#people = people
    this.options = options
  }

  static make<T extends Constructor<FamilyTreeError>>(
    people: readonly Person[],
    options: Readonly<FamilyTreeOptions>,
    expectedErrors: T[],
  ): FamilyTreeResult<InstanceType<T>> {
    const errors = this.checkValidity(people, options)
    checkExpectedErrors(errors, expectedErrors)
    if (errors[0]) {
      return {
        success: false,
        errors,
      }
    }
    return {
      success: true,
      tree: new FamilyTree(
        new Map(people.map((person) => [person.id, person])),
        options,
      ),
    }
  }

  static checkValidity(
    people: readonly Person[],
    options: Readonly<FamilyTreeOptions>,
  ): FamilyTreeError[] {
    const peopleMap = new Map<number, Person>()
    const storedIds = new Set<StorageId>()
    const errors: FamilyTreeError[] = []
    for (const person of people) {
      if (peopleMap.has(person.id)) {
        errors.push(new FamilyTreeDuplicateIdError(person.id))
      } else {
        peopleMap.set(person.id, person)
      }
    }
    for (const person of peopleMap.values()) {
      if (storedIds.has(person.storedId)) {
        errors.push(
          new FamilyTreeDuplicateStoredIdError("person", person.storedId),
        )
      } else {
        storedIds.add(person.storedId)
      }

      if (person.conception && typeof person.conception.father === "object") {
        // Has a non-anonymous father
        const father = person.conception.father
        if (!peopleMap.has(father.id) || peopleMap.get(father.id) !== father) {
          errors.push(new FamilyTreeUnrecognizedIdError(father.id))
        }
        if (options.enforceParentGender && father.gender !== "m") {
          errors.push(new FamilyTreeParentGenderError(father, "father"))
        }
        if (
          options.preventSelfing &&
          father === person.conception.birth.mother
        ) {
          errors.push(new FamilyTreeSelfingError(father, person))
        }
      }

      if (
        person.conception &&
        typeof person.conception.birth.mother === "object"
      ) {
        // Has a non-anonymous mother
        const mother = person.conception.birth.mother
        if (!peopleMap.has(mother.id) || peopleMap.get(mother.id) !== mother) {
          errors.push(new FamilyTreeUnrecognizedIdError(mother.id))
        }
        if (mother.gender !== "f") {
          errors.push(new FamilyTreeParentGenderError(mother, "mother"))
        }
      }
    }

    // TODO: Check cyclic ancestry
    return errors
  }

  static fromStored(
    {
      people: storedPeople,
      conceptions: storedConceptions,
      births: storedBirths,
    }: StoredTree,
    options: Readonly<FamilyTreeOptions>,
  ): FamilyTreeResult<FamilyTreeError> {
    // Maps stored ID to [person, conceptionId] tuple
    const peopleMap = new Map<StorageId, [Person, StorageId | null]>()
    const conceptionsMap = new Map<StorageId, Conception>()
    const birthsMap = new Map<StorageId, Birth>()
    const people: Person[] = []
    const errors: FamilyTreeError[] = []
    let nextId = 0
    for (const person of storedPeople) {
      if (peopleMap.has(person.id)) {
        errors.push(new FamilyTreeDuplicateStoredIdError("person", person.id))
        continue
      }
      peopleMap.set(person.id, [
        {
          id: nextId++,
          storedId: person.id,
          gender: person.gender,
          name: person.name ?? null,
          // Conception must start off as null
          // Will be initialized later, after we've processed the conceptions
          conception: null,
          generation: person.generation ?? null,
          image: person.image ?? null,
          isHidden: !!person.isHidden,
        },
        person.conception ?? null,
      ])
    }
    for (const birth of storedBirths) {
      if (birthsMap.has(birth.id)) {
        errors.push(new FamilyTreeDuplicateStoredIdError("birth", birth.id))
        continue
      }
      let mother
      if (birth.mother === null) {
        mother = Symbol()
      } else {
        mother = peopleMap.get(birth.mother)?.[0]
        if (mother === undefined) {
          errors.push(
            new FamilyTreeUnrecognizedStoredIdError(
              "birth",
              birth.id,
              "person",
              birth.mother,
            ),
          )
          continue
        }
      }
      birthsMap.set(birth.id, { mother })
    }
    for (const conception of storedConceptions) {
      if (conceptionsMap.has(conception.id)) {
        errors.push(
          new FamilyTreeDuplicateStoredIdError("conception", conception.id),
        )
        continue
      }
      let father
      if (conception.father === null) {
        father = Symbol()
      } else {
        father = peopleMap.get(conception.father)?.[0]
        if (father === undefined) {
          errors.push(
            new FamilyTreeUnrecognizedStoredIdError(
              "conception",
              conception.id,
              "person",
              conception.father,
            ),
          )
          continue
        }
      }
      const birth = birthsMap.get(conception.birth)
      if (birth === undefined) {
        errors.push(
          new FamilyTreeUnrecognizedStoredIdError(
            "conception",
            conception.id,
            "birth",
            conception.birth,
          ),
        )
        continue
      }
      conceptionsMap.set(conception.id, { father, birth })
    }
    for (const [personId, [person, conceptionId]] of peopleMap) {
      people.push(person)
      if (conceptionId === null) {
        continue
      }
      const conception = conceptionsMap.get(conceptionId)
      if (conception === undefined) {
        errors.push(
          new FamilyTreeUnrecognizedStoredIdError(
            "person",
            personId,
            "conception",
            conceptionId,
          ),
        )
        continue
      }
      person.conception = conception
    }
    const result = this.make(people, options, [
      FamilyTreeParentGenderError,
      FamilyTreeCyclicAncestryError,
      FamilyTreeSelfingError,
    ])
    if (!result.success || errors.length) {
      const resultErrors = result.success ? [] : result.errors
      return {
        success: false,
        errors: [...errors, ...resultErrors],
      }
    }
    return result
  }

  copy(): Map<number, Person> {
    // Maps referentially old conception to corresponding new conception
    const conceptionsMap = new Map<Conception, Conception>()
    // Maps referentially old birth to corresponding new birth
    const birthsMap = new Map<Birth, Birth>()
    const people = new Map<number, Person>()
    for (const person of this.#people.values()) {
      people.set(person.id, {
        // person.conception is still referentially old Conception
        ...person,
      })
    }
    for (const person of people.values()) {
      if (person.conception === null) {
        continue
      }
      let conception = conceptionsMap.get(person.conception)
      if (conception === undefined) {
        let birth = birthsMap.get(person.conception.birth)
        if (birth === undefined) {
          // Referentially old mother
          const mother = person.conception.birth.mother
          let newMother
          if (typeof mother === "symbol") {
            newMother = mother
          } else {
            newMother = people.get(mother.id)
            if (newMother === undefined) {
              // Constraint violation, should be impossible
              throw new FamilyTreeUnrecognizedIdError(mother.id)
            }
          }
          birth = { mother: newMother }
          birthsMap.set(person.conception.birth, birth)
        }
        const father = person.conception.father
        let newFather
        if (typeof father === "symbol") {
          newFather = father
        } else {
          newFather = people.get(father.id)
          if (newFather === undefined) {
            // Likewise
            throw new FamilyTreeUnrecognizedIdError(father.id)
          }
        }
        conception = { father: newFather, birth }
        conceptionsMap.set(person.conception, conception)
      }
      person.conception = conception
    }
    return people
  }

  addPerson(
    storedId: StorageId,
  ): FamilyTreeResult<FamilyTreeDuplicateStoredIdError> {
    const newTree = this.copy()
    const nextId = newTree.size ? Math.max(...newTree.keys()) + 1 : 0
    newTree.set(nextId, {
      id: nextId,
      storedId,
      gender: "m",
      name: null,
      conception: null,
      generation: null,
      image: null,
      isHidden: false,
    })
    return FamilyTree.make([...newTree.values()], this.options, [
      FamilyTreeDuplicateStoredIdError,
    ])
  }

  setFather(
    personId: number,
    fatherId: number | null,
  ): FamilyTreeResult<
    | FamilyTreeUnrecognizedIdError
    | FamilyTreeParentGenderError
    | FamilyTreeCyclicAncestryError
    | FamilyTreeSelfingError
  > {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    let father
    if (fatherId === null) {
      father = Symbol()
    } else {
      father = newTree.get(fatherId)
      if (father === undefined) {
        return {
          success: false,
          errors: [new FamilyTreeUnrecognizedIdError(fatherId)],
        }
      }
    }
    if (person.conception === null) {
      person.conception = { father, birth: { mother: Symbol() } }
    } else {
      person.conception.father = father
    }
    return FamilyTree.make([...newTree.values()], this.options, [
      FamilyTreeParentGenderError,
      FamilyTreeCyclicAncestryError,
      FamilyTreeSelfingError,
    ])
  }

  setMother(
    personId: number,
    motherId: number | null,
  ): FamilyTreeResult<
    | FamilyTreeUnrecognizedIdError
    | FamilyTreeParentGenderError
    | FamilyTreeCyclicAncestryError
    | FamilyTreeSelfingError
  > {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    let mother
    if (motherId === null) {
      mother = Symbol()
    } else {
      mother = newTree.get(motherId)
      if (mother === undefined) {
        return {
          success: false,
          errors: [new FamilyTreeUnrecognizedIdError(motherId)],
        }
      }
    }
    if (person.conception === null) {
      const birth = { mother }
      person.conception = {
        father: Symbol(),
        birth,
      }
    } else {
      person.conception.birth.mother = mother
    }
    return FamilyTree.make([...newTree.values()], this.options, [
      FamilyTreeParentGenderError,
      FamilyTreeCyclicAncestryError,
      FamilyTreeSelfingError,
    ])
  }

  makeFounder(
    personId: number,
  ): FamilyTreeResult<FamilyTreeUnrecognizedIdError> {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    person.conception = null
    return FamilyTree.make([...newTree.values()], this.options, [])
  }

  makeTwin(
    personId: number,
    twinId: number,
    type: "identical" | "fraternal",
    parentsToChange: "ours" | "theirs",
  ): FamilyTreeResult<
    | FamilyTreeUnrecognizedIdError
    | FamilyTreeParentGenderError
    | FamilyTreeCyclicAncestryError
    | FamilyTreeSelfingError
  > {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    const twin = newTree.get(twinId)
    if (twin === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(twinId)],
      }
    }
    const [from, to] =
      parentsToChange === "ours" ? [twin, person] : [person, twin]
    if (from.conception === null) {
      from.conception = { father: Symbol(), birth: { mother: Symbol() } }
    }
    if (type === "identical") {
      to.conception = from.conception
    } else {
      if (to.conception === null) {
        to.conception = { father: Symbol(), birth: { mother: Symbol() } }
      }
      to.conception.birth = from.conception.birth
    }
    return FamilyTree.make([...newTree.values()], this.options, [
      FamilyTreeParentGenderError,
      FamilyTreeCyclicAncestryError,
      FamilyTreeSelfingError,
    ])
  }

  clearTwins(
    personId: number,
    type: "fraternal" | "all",
  ): FamilyTreeResult<FamilyTreeUnrecognizedIdError> {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    if (person.conception !== null) {
      if (type === "all") {
        person.conception = {
          father: person.conception.father,
          birth: { mother: person.conception.birth.mother },
        }
      } else {
        person.conception.birth = { mother: person.conception.birth.mother }
      }
    }
    return FamilyTree.make([...newTree.values()], this.options, [])
  }

  deletePerson(
    personId: number,
  ): FamilyTreeResult<FamilyTreeUnrecognizedIdError> {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    newTree.delete(personId)
    for (const other of newTree.values()) {
      if (other.conception?.father === person) {
        other.conception.father = Symbol()
      }
      if (other.conception?.birth?.mother === person) {
        other.conception.birth.mother = Symbol()
      }
    }
    return FamilyTree.make([...newTree.values()], this.options, [])
  }

  setStoredId(
    personId: number,
    newStoredId: StorageId,
  ): FamilyTreeResult<
    FamilyTreeUnrecognizedIdError | FamilyTreeDuplicateStoredIdError
  > {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    person.storedId = newStoredId
    return FamilyTree.make([...newTree.values()], this.options, [
      FamilyTreeDuplicateStoredIdError,
    ])
  }

  setGender(
    personId: number,
    gender: "m" | "f",
  ): FamilyTreeResult<
    FamilyTreeUnrecognizedIdError | FamilyTreeParentGenderError
  > {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    person.gender = gender
    for (const other of newTree.values()) {
      if (
        other.conception?.father === person &&
        gender === "f" &&
        this.options.enforceParentGender
      ) {
        other.conception.father = Symbol()
      }
      if (other.conception?.birth?.mother === person && gender === "m") {
        other.conception.birth.mother = Symbol()
      }
    }
    return FamilyTree.make([...newTree.values()], this.options, [
      FamilyTreeParentGenderError,
    ])
  }

  setAttribute<
    K extends Exclude<
      keyof Person,
      "id" | "storedId" | "gender" | "conception"
    >,
  >(
    personId: number,
    key: K,
    value: Person[K],
  ): FamilyTreeResult<FamilyTreeUnrecognizedIdError> {
    const newTree = this.copy()
    const person = newTree.get(personId)
    if (person === undefined) {
      return {
        success: false,
        errors: [new FamilyTreeUnrecognizedIdError(personId)],
      }
    }
    person[key] = value
    return FamilyTree.make([...newTree.values()], this.options, [])
  }

  serialize(): StoredTree {
    const birthIds = new Map<Birth, string>()
    const conceptionIds = new Map<Conception, string>()

    let nextBirthId = 0
    let nextConceptionId = 0

    const storedPeople: StoredPerson[] = []
    const storedConceptions: StoredConception[] = []
    const storedBirths: StoredBirth[] = []

    for (const person of this.#people.values()) {
      const conception = person.conception
      let conceptionId
      if (conception === null) {
        conceptionId = undefined
      } else {
        let birthId = birthIds.get(conception.birth)
        if (birthId === undefined) {
          birthId = `birth-${nextBirthId++}`
          birthIds.set(conception.birth, birthId)
          const motherId =
            typeof conception.birth.mother === "symbol"
              ? null
              : conception.birth.mother.storedId
          storedBirths.push({
            id: birthId,
            mother: motherId,
          })
        }
        conceptionId = conceptionIds.get(conception)
        if (conceptionId === undefined) {
          conceptionId = `conception-${nextConceptionId++}`
          conceptionIds.set(conception, conceptionId)
          const fatherId =
            typeof conception.father === "symbol"
              ? null
              : conception.father.storedId
          storedConceptions.push({
            id: conceptionId,
            birth: birthId,
            father: fatherId,
          })
        }
      }
      storedPeople.push({
        id: person.storedId,
        gender: person.gender,
        name: person.name,
        conception: conceptionId,
        generation: person.generation,
        image: person.image,
        isHidden: person.isHidden || undefined,
      })
    }

    return {
      people: storedPeople,
      conceptions: storedConceptions,
      births: storedBirths,
    }
  }
}
