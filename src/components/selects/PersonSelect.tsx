import { PersonDisplay } from "@family-tree/components/PersonDisplay"
import type { Person } from "@family-tree/family/person"
import { Autocomplete, TextField } from "@mui/material"

export interface PersonSelectProps {
  selectedPerson: Person | null
  selectPerson: (person: Person | null) => void
  options: Person[]
}

export function PersonSelect({
  selectedPerson,
  selectPerson,
  options,
}: PersonSelectProps) {
  return (
    <Autocomplete<Person>
      renderInput={(params) => <TextField {...params} label="PersonSelect" />}
      renderValue={(person) => <PersonDisplay person={person} />}
      getOptionLabel={(person) =>
        typeof person.id === "string" ? `"${person.id}"` : `${person.id}`
      }
      value={selectedPerson}
      options={options}
      onChange={(_, value) => selectPerson(value)}
      autoComplete
    />
  )
}
