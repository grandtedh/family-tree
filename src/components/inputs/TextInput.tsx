import { BaseInput } from "@family-tree/components/inputs/BaseInput"

export interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function TextInput({ label, value, onChange }: TextInputProps) {
  return <BaseInput label={label} value={value} onChange={onChange} />
}
