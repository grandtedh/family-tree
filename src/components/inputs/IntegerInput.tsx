import { BaseInput } from "@family-tree/components/inputs/BaseInput"
import {
  intValidator,
  nonNumberRegex,
} from "@family-tree/components/inputs/validator"
import { useState } from "react"

export interface IntegerInputProps {
  label: string
  initialValue: number
  onChange: (value: number) => void
}

export function IntegerInput({
  label,
  initialValue,
  onChange,
}: IntegerInputProps) {
  const [value, setValue] = useState(String(Math.round(initialValue)))
  const validationResult = intValidator.safeDecode(value)

  function change(value: string) {
    const strippedValue = value.replace(nonNumberRegex, "")
    const result = intValidator.safeDecode(strippedValue)
    if (result.success) {
      onChange(result.data)
    }
    setValue(strippedValue)
  }

  return (
    <BaseInput
      label={label}
      value={value}
      onChange={change}
      inputMode="numeric"
      error={validationResult.error?.issues?.[0]?.message}
    />
  )
}
