import { useEffect, useState } from "react"
import { FamilyTree } from "@family-tree/family/tree"
import { type StorageId } from "@family-tree/family/stored"
import EditPerson from "@family-tree/components/EditPerson"
import type { PersonAttributes } from "@family-tree/family/person"

function App() {
  const [tree, setTree] = useState(
    new FamilyTree([{ id: "A", gender: "m" }], [], []),
  )
  const [selectedId, setSelectedId] = useState<StorageId>()

  const selectedPerson =
    selectedId === undefined ? undefined : tree.people.get(selectedId)

  useEffect(() => {
    const serialized = tree.serialize()
    console.log(
      "People:",
      JSON.stringify(serialized.people, undefined, 2),
      "Conceptions:",
      JSON.stringify(serialized.conceptions, undefined, 2),
      "Births:",
      JSON.stringify(serialized.births, undefined, 2),
    )
  }, [tree])

  function addPerson() {
    let id = 1
    while (tree.people.has(id)) {
      id++
    }

    setTree(
      tree.addPerson({
        id: id,
        gender: "m",
      }),
    )
    setSelectedId(id)
  }

  function deletePerson() {
    if (selectedId === undefined) return

    setTree(tree.deletePerson(selectedId))
    setSelectedId(undefined)
  }

  function editPerson(attributes: PersonAttributes) {
    if (selectedId === undefined) return

    setTree(tree.editPerson(selectedId, attributes))
  }

  function editPersonId(newId: StorageId) {
    if (selectedId === undefined) return

    setTree(tree.setPersonId(selectedId, newId))
    setSelectedId(newId)
  }

  function setFather(fatherId: StorageId | null) {
    if (selectedId === undefined) return
    setTree(tree.setFather(selectedId, fatherId))
  }

  function setMother(motherId: StorageId | null) {
    if (selectedId === undefined) return
    setTree(tree.setMother(selectedId, motherId))
  }

  function makeFounder() {
    if (selectedId === undefined) return
    setTree(tree.makeFounder(selectedId))
  }

  function makeTwin(twinId: StorageId | null, type: "identical" | "fraternal") {
    if (selectedId === undefined) return
    setTree(tree.makeTwin(selectedId, twinId, type))
  }

  return (
    <>
      <h1>Family Tree</h1>

      <button onClick={addPerson}>Add person</button>

      <p>
        <label>
          Person:{" "}
          <select
            value={toStringId(selectedId)}
            onChange={(e) => setSelectedId(fromStringId(e.currentTarget.value))}
          >
            <option value="">--Please select an id--</option>
            {[...tree.people.entries()].map(([personId, person]) => (
              <option key={toStringId(personId)} value={toStringId(personId)}>
                {person.name ?? personId}
              </option>
            ))}
          </select>
        </label>
      </p>

      {selectedPerson !== undefined && (
        <EditPerson
          person={selectedPerson}
          people={[...tree.people.values()]}
          setPersonId={editPersonId}
          editPerson={editPerson}
          setFather={setFather}
          setMother={setMother}
          makeFounder={makeFounder}
          makeTwin={makeTwin}
          deletePerson={deletePerson}
        />
      )}
    </>
  )
}

function toStringId(id: StorageId | undefined) {
  if (id === undefined) {
    return ""
  }
  if (typeof id === "number") {
    return `n${id}`
  }
  return `s${id}`
}

function fromStringId(id: string): StorageId | undefined {
  if (id === "") {
    return undefined
  }
  if (id[0] === "n") {
    return Number(id.slice(1))
  }
  return id.slice(1)
}

export default App
