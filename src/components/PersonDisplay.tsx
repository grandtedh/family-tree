import { type ReadonlyPerson } from "@family-tree/family/person"
import styles from "./styles.module.css"

export interface PersonProps {
  person: ReadonlyPerson
}

export function PersonDisplay({ person }: PersonProps) {
  return (
    <p className={styles["person-display"]}>
      {typeof person.id === "string" ? `"${person.id}"` : person.id}
      {person.name !== undefined && ` (${person.name})`}
    </p>
  )
}
