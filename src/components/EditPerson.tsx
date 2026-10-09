import type {
  PersonAttributes,
  ReadonlyPerson,
} from "@family-tree/family/person"
import type { StorageId } from "@family-tree/family/stored"
import { InputAdornment, TextField } from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import { z } from "zod"
import { DraftTextInput } from "@family-tree/components/inputs/DraftTextInput"

interface EditPersonProps {
  person: ReadonlyPerson
  people: ReadonlyPerson[]
  setPersonId: (id: StorageId) => void
  editPerson: (attributes: PersonAttributes) => void
  setFather: (id: StorageId | null) => void
  setMother: (id: StorageId | null) => void
  makeFounder: () => void
  makeTwin: (id: StorageId | null, type: "identical" | "fraternal") => void
  deletePerson: () => void
}

export default function EditPerson({
  person,
  people,
  setPersonId,
  editPerson,
  setFather,
  setMother,
  makeFounder,
  makeTwin,
  deletePerson,
}: EditPersonProps) {
  return (
    <>
      <h2>Edit person</h2>

      <h3>ID</h3>

      <DraftTextInput
        label={"ID"}
        value={String(person.id)}
        onSave={(value) => {
          setPersonId(value)
          return { success: true }
        }}
      />

      <form
        id="edit-person-id"
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.target)
          setPersonId(formData.get("person-id-input") as string)
        }}
      >
        <label htmlFor="person-id-input">ID:</label>
        <input
          id="person-id-input"
          name="person-id-input"
          defaultValue={person.id}
        />
        <button>Save</button>
      </form>

      <h3>Attributes</h3>

      <p>
        <label>
          Name:{" "}
          <input
            value={person.name ?? ""}
            onChange={(e) =>
              editPerson({
                name: e.currentTarget.value || undefined,
                gender: person.gender,
                generation: person.generation,
                isHidden: person.isHidden,
                image: person.image,
              })
            }
          />
        </label>
      </p>

      <p>
        <label>
          Gender:{" "}
          <select
            value={person.gender}
            onChange={(e) =>
              editPerson({
                name: person.name,
                gender: e.currentTarget.value as "m" | "f",
                generation: person.generation,
                isHidden: person.isHidden,
                image: person.image,
              })
            }
          >
            <option value="m">Male</option>
            <option value="f">Female</option>
          </select>
        </label>
      </p>

      <p>
        <label>
          Generation:{" "}
          <input
            type="number"
            disabled={person.conception !== undefined}
            value={person.generation ?? ""}
            onChange={(e) =>
              editPerson({
                name: person.name,
                gender: person.gender,
                generation:
                  e.currentTarget.value === ""
                    ? undefined
                    : Number(e.currentTarget.value),
                isHidden: person.isHidden,
                image: person.image,
              })
            }
          />
        </label>
      </p>

      <p>
        <label>
          Hidden:{" "}
          <input
            type="checkbox"
            checked={person.isHidden}
            onChange={(e) =>
              editPerson({
                name: person.name,
                gender: person.gender,
                generation: person.generation,
                isHidden: e.currentTarget.checked,
                image: person.image,
              })
            }
          />
        </label>
      </p>

      <h3>Relationships</h3>

      <p>
        <label>
          Is Founder?:{" "}
          <input
            type="checkbox"
            checked={person.conception === undefined}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                makeFounder()
              } else {
                setFather(null)
              }
            }}
          />
        </label>
      </p>

      {person.conception !== undefined && (
        <>
          <h4>Parents</h4>
          <p>
            <label>
              Father:{" "}
              <select
                value={toStringId(
                  typeof person.conception.father === "symbol"
                    ? undefined
                    : person.conception.father.id,
                )}
                onChange={(e) => {
                  const id = fromStringId(e.currentTarget.value)
                  setFather(id ?? null)
                }}
              >
                <option value="">--anonymous--</option>
                {people.map((person) => (
                  <option key={person.id} value={toStringId(person.id)}>
                    {person.name ?? person.id}
                  </option>
                ))}
              </select>
            </label>
          </p>
          <p>
            <label>
              Mother:{" "}
              <select
                value={toStringId(
                  typeof person.conception.birth.mother === "symbol"
                    ? undefined
                    : person.conception.birth.mother.id,
                )}
                onChange={(e) => {
                  const id = fromStringId(e.currentTarget.value)
                  setMother(id ?? null)
                }}
              >
                <option value="">--anonymous--</option>
                {people
                  .filter((person) => person.gender === "f")
                  .map((person) => (
                    <option key={person.id} value={toStringId(person.id)}>
                      {person.name ?? person.id}
                    </option>
                  ))}
              </select>
            </label>
          </p>
          <h4>Multiples</h4>
          <p>
            Fraternals:{" "}
            {people
              .filter(
                (other) =>
                  other !== person &&
                  other.conception !== person.conception &&
                  other.conception?.birth === person.conception?.birth,
              )
              .map((person) => person.name ?? person.id)
              .join(", ")}
          </p>
          <button onClick={() => makeTwin(null, "fraternal")}>
            Delete twins
          </button>
          <p>
            Identicals:{" "}
            {people
              .filter(
                (other) =>
                  other !== person && other.conception === person.conception,
              )
              .map((person) => person.name ?? person.id)
              .join(", ")}
          </p>
          <button onClick={() => makeTwin(null, "identical")}>
            Delete identical twins
          </button>
          <p>
            <label>
              Add Fraternal Twin:{" "}
              <select
                value=""
                onChange={(e) => {
                  const value = e.currentTarget.value
                  if (value !== "") {
                    makeTwin(fromStringId(value)!, "fraternal")
                  }
                }}
              >
                <option value="">--select twin--</option>
                {people
                  .filter((other) => other !== person)
                  .map((person) => (
                    <option key={person.id} value={toStringId(person.id)}>
                      {person.name ?? person.id}
                    </option>
                  ))}
              </select>
            </label>
          </p>
          <p>
            <label>
              Add Identical Twin:{" "}
              <select
                value=""
                onChange={(e) => {
                  const value = e.currentTarget.value
                  if (value !== "") {
                    makeTwin(fromStringId(value)!, "identical")
                  }
                }}
              >
                <option value="">--select twin--</option>
                {people
                  .filter((other) => other !== person)
                  .map((person) => (
                    <option key={person.id} value={toStringId(person.id)}>
                      {person.name ?? person.id}
                    </option>
                  ))}
              </select>
            </label>
          </p>
        </>
      )}
      <button onClick={deletePerson}>Delete person</button>
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
