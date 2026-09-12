import {
  type StoredPerson,
  type StoredConception,
  type StoredBirth,
  StorageId,
} from "./stored"
import { Person, type ReadonlyPerson } from "./person"
import { Birth } from "./birth"
import { Conception } from "./conception"
import {
  FamilyTreeDuplicateIdError,
  FamilyTreeUnrecognizedIdError,
  FamilyTreeUnrecognizedStoredIdError,
} from "./errors"
import type { ImageUrl } from "./image"

export class FamilyTree {
  #people: Map<StorageId, Person>
  get people(): ReadonlyMap<StorageId, ReadonlyPerson> {
    return this.#people
  }

  constructor(tree: FamilyTree)
  constructor(
    people: StoredPerson[],
    conceptions: StoredConception[],
    births: StoredBirth[],
  )
  constructor(
    ...args:
      | [tree: FamilyTree]
      | [
          people: StoredPerson[],
          conceptions: StoredConception[],
          births: StoredBirth[],
        ]
  ) {
    this.#people = new Map()
    if (args.length === 1) {
      // Copy constructor
      const [tree] = args
      this.#copyConstructor(tree)
    } else {
      const [people, conceptions, births] = args
      this.#storedConstructor(people, conceptions, births)
    }
  }

  addPerson(person: {
    id: StorageId
    name?: string | undefined
    generation?: number | undefined
    gender: "m" | "f"
    isHidden?: boolean
    image?: ImageUrl | undefined
  }) {
    const newTree = new FamilyTree(this)
    if (newTree.#people.has(person.id)) {
      throw new FamilyTreeDuplicateIdError("person", person.id)
    }
    newTree.#people.set(person.id, new Person(person))
    return newTree
  }

  setFather(personId: StorageId, fatherId: StorageId | null) {
    const newTree = new FamilyTree(this)
    const person = newTree.#people.get(personId)
    if (person === undefined) {
      throw new FamilyTreeUnrecognizedIdError(personId)
    }
    let father
    if (fatherId === null) {
      father = Symbol()
    } else {
      father = newTree.#people.get(fatherId)
      if (father === undefined) {
        throw new FamilyTreeUnrecognizedIdError(fatherId)
      }
    }
    if (person.conception === undefined) {
      const birth = new Birth({ mother: Symbol() })
      person.conception = new Conception({ father, birth })
    } else {
      person.conception.father = father
    }
    return newTree
  }

  setMother(personId: StorageId, motherId: StorageId | null) {
    const newTree = new FamilyTree(this)
    const person = newTree.#people.get(personId)
    if (person === undefined) {
      throw new FamilyTreeUnrecognizedIdError(personId)
    }
    let mother
    if (motherId === null) {
      mother = Symbol()
    } else {
      mother = newTree.#people.get(motherId)
      if (mother === undefined) {
        throw new FamilyTreeUnrecognizedIdError(motherId)
      }
    }
    if (person.conception === undefined) {
      const birth = new Birth({ mother })
      person.conception = new Conception({
        father: Symbol(),
        birth,
      })
    } else {
      person.conception.birth.mother = mother
    }
    return newTree
  }

  makeFounder(personId: StorageId) {
    const newTree = new FamilyTree(this)
    const person = newTree.#people.get(personId)
    if (person === undefined) {
      throw new FamilyTreeUnrecognizedIdError(personId)
    }
    person.conception = undefined
    return newTree
  }

  makeTwin(
    personId: StorageId,
    twinId: StorageId | null,
    type: "identical" | "fraternal",
  ) {
    const newTree = new FamilyTree(this)
    const person = newTree.#people.get(personId)
    if (person === undefined) {
      throw new FamilyTreeUnrecognizedIdError(personId)
    }
    const father = person.conception?.father ?? Symbol()
    const mother = person.conception?.birth?.mother ?? Symbol()
    if (twinId === null) {
      let birth
      if (type === "identical") {
        birth = person.conception?.birth ?? new Birth({ mother })
      } else {
        birth = new Birth({ mother })
      }
      person.conception = new Conception({ father, birth })
      return newTree
    }
    const twin = newTree.#people.get(twinId)
    if (twin === undefined) {
      throw new FamilyTreeUnrecognizedIdError(twinId)
    }
    if (twin.conception === undefined) {
      const birth = new Birth({ mother: mother ?? Symbol() })
      twin.conception = new Conception({
        father: father ?? Symbol(),
        birth,
      })
    }
    if (type === "identical") {
      person.conception = twin.conception
    } else {
      person.conception = new Conception({
        father,
        birth: twin.conception.birth,
      })
    }
    return newTree
  }

  deletePerson(personId: StorageId) {
    const newTree = new FamilyTree(this)
    const isDeleteSuccessful = newTree.#people.delete(personId)
    if (!isDeleteSuccessful) {
      throw new FamilyTreeUnrecognizedIdError(personId)
    }
    return newTree
  }

  editPerson(
    personId: StorageId,
    properties: {
      name?: string | undefined
      generation?: number | undefined
      gender: "m" | "f"
      isHidden?: boolean | undefined
      image?: ImageUrl | undefined
    },
  ) {
    const newTree = new FamilyTree(this)
    const person = newTree.#people.get(personId)
    if (person === undefined) {
      throw new FamilyTreeUnrecognizedIdError(personId)
    }
    person.name = properties.name
    person.generation = properties.generation
    person.gender = properties.gender
    person.isHidden = !!properties.isHidden
    person.image = properties.image
    return newTree
  }

  setPersonId(personId: StorageId, newPersonId: StorageId) {
    const newTree = new FamilyTree(this)
    const person = newTree.#people.get(personId)
    if (person === undefined) {
      throw new FamilyTreeUnrecognizedIdError(personId)
    }
    if (newTree.#people.has(newPersonId)) {
      throw new FamilyTreeDuplicateIdError("person", newPersonId)
    }
    person.id = newPersonId
    newTree.#people.delete(personId)
    newTree.#people.set(newPersonId, person)
    return newTree
  }

  serialize(): {
    people: StoredPerson[]
    conceptions: StoredConception[]
    births: StoredBirth[]
  } {
    const birthIds = new Map<Birth, string>()
    const conceptionIds = new Map<Conception, string>()

    let nextBirthId = 0
    let nextConceptionId = 0

    const storedPeople: StoredPerson[] = []
    const storedConceptions: StoredConception[] = []
    const storedBirths: StoredBirth[] = []

    for (const person of this.#people.values()) {
      if (typeof person.id === "symbol") {
        continue
      }
      const conception = person.conception
      let conceptionId
      if (conception === undefined) {
        conceptionId = undefined
      } else {
        let birthId = birthIds.get(conception.birth)
        if (birthId === undefined) {
          birthId = `birth-${nextBirthId++}`
          birthIds.set(conception.birth, birthId)
          const motherId =
            typeof conception.birth.mother === "symbol"
              ? null
              : conception.birth.mother.id
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
            typeof conception.father === "symbol" ? null : conception.father.id
          storedConceptions.push({
            id: conceptionId,
            birth: birthId,
            father: fatherId,
          })
        }
      }
      let origin
      if (conceptionId === undefined) {
        origin = {
          generation: person.generation,
        }
      } else {
        origin = {
          conception: conceptionId,
        }
      }
      storedPeople.push({
        ...origin,
        id: person.id,
        gender: person.gender,
        name: person.name,
        isHidden: person.isHidden,
        image: person.image,
      })
    }

    return {
      people: storedPeople,
      conceptions: storedConceptions,
      births: storedBirths,
    }
  }

  #copyConstructor(tree: FamilyTree) {
    const conceptionsMap = new Map<Conception, Conception>()
    const birthsMap = new Map<Birth, Birth>()
    for (const [id, person] of tree.#people) {
      this.#people.set(
        id,
        new Person({
          id,
          name: person.name,
          gender: person.gender,
          // person.conception is currently old Conception
          conception: person.conception,
          generation: person.generation,
          image: person.image,
        }),
      )
    }
    for (const person of this.#people.values()) {
      if (person.conception !== undefined) {
        let conception = conceptionsMap.get(person.conception)
        if (conception === undefined) {
          let birth = birthsMap.get(person.conception.birth)
          if (birth === undefined) {
            const mother = person.conception.birth.mother
            let newMother
            if (typeof mother === "symbol") {
              newMother = mother
            } else {
              newMother = this.#people.get(mother.id)
              if (newMother === undefined) {
                // Shouldn't be possible, since we initialized every person in the tree already
                throw new Error("Couldn't find mother in person map.")
              }
            }
            birth = new Birth({ mother: newMother })
            birthsMap.set(person.conception.birth, birth)
          }
          const father = person.conception.father
          let newFather
          if (typeof father === "symbol") {
            newFather = father
          } else {
            newFather = this.#people.get(father.id)
            // Likewise
            if (newFather === undefined) {
              throw new Error("Couldn't find father in person map.")
            }
          }
          conception = new Conception({ father: newFather, birth })
          conceptionsMap.set(person.conception, conception)
        }
        person.conception = conception
      }
    }
  }

  #storedConstructor(
    people: StoredPerson[],
    conceptions: StoredConception[],
    births: StoredBirth[],
  ) {
    const peopleMap = new Map<StorageId, [Person, StorageId | undefined]>()
    const conceptionsMap = new Map<StorageId, Conception>()
    const birthsMap = new Map<StorageId, Birth>()
    for (const person of people) {
      if (peopleMap.has(person.id)) {
        throw new FamilyTreeDuplicateIdError("person", person.id)
      }
      peopleMap.set(person.id, [
        new Person({
          id: person.id,
          name: person.name ?? undefined,
          gender: person.gender,
          generation: person.generation ?? undefined,
          isHidden: !!person.isHidden,
          image: person.image ?? undefined,
        }),
        person.conception ?? undefined,
      ])
    }
    for (const birth of births) {
      if (birthsMap.has(birth.id)) {
        throw new FamilyTreeDuplicateIdError("birth", birth.id)
      }
      let mother
      if (birth.mother === null) {
        mother = Symbol()
      } else {
        const motherAndConception = peopleMap.get(birth.mother)
        if (motherAndConception === undefined) {
          throw new FamilyTreeUnrecognizedStoredIdError(
            "birth",
            birth.id,
            "person",
            birth.mother,
          )
        }
        mother = motherAndConception[0]
      }
      birthsMap.set(birth.id, new Birth({ mother }))
    }
    for (const conception of conceptions) {
      if (conceptionsMap.has(conception.id)) {
        throw new FamilyTreeDuplicateIdError("conception", conception.id)
      }
      let father
      if (conception.father === null) {
        father = Symbol()
      } else {
        const fatherAndConception = peopleMap.get(conception.father)
        if (fatherAndConception === undefined) {
          throw new FamilyTreeUnrecognizedStoredIdError(
            "conception",
            conception.id,
            "person",
            conception.father,
          )
        }
        father = fatherAndConception[0]
      }
      const birth = birthsMap.get(conception.birth)
      if (birth === undefined) {
        throw new FamilyTreeUnrecognizedStoredIdError(
          "conception",
          conception.id,
          "birth",
          conception.birth,
        )
      }
      conceptionsMap.set(
        conception.id,
        new Conception({ father: father, birth }),
      )
    }
    for (const [personId, [person, conceptionId]] of peopleMap) {
      this.#people.set(personId, person)
      if (conceptionId === undefined) {
        continue
      }
      const conception = conceptionsMap.get(conceptionId)
      if (conception === undefined) {
        throw new FamilyTreeUnrecognizedStoredIdError(
          "person",
          personId,
          "conception",
          conceptionId,
        )
      }
      person.conception = conception
    }
  }
}
