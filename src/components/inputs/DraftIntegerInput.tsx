import {
  BaseInput,
  type BaseInputHandle,
} from "@family-tree/components/inputs/BaseInput"
import {
  type DraftType,
  type SaveResult,
} from "@family-tree/components/inputs/DraftTextInput"
import {
  intValidator,
  nonNumberRegex,
} from "@family-tree/components/inputs/validator"
import { useRef, useState } from "react"
import { z } from "zod"

export interface DraftIntegerInputProps {
  label: string
  value: number
  onSave: (value: number) => SaveResult | Promise<SaveResult>
  validator?: z.ZodNumber | undefined
}

export function DraftIntegerInput({
  label,
  value,
  onSave,
  validator,
}: DraftIntegerInputProps) {
  const [draft, setDraftState] = useState<DraftType>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const ref = useRef<BaseInputHandle>(null)

  function setDraft(value: DraftType) {
    setDraftState(value)
    setSaveError(null)
  }

  if (draft === null) {
    const strValue = String(value)
    return (
      <BaseInput
        label={label}
        editing={false}
        inputMode="numeric"
        value={strValue}
        onStartEditing={() => {
          setDraft({ value: strValue, isSaving: false })
          ref.current?.focus()
        }}
        ref={ref}
      />
    )
  }
  const combinedValidator = validator
    ? intValidator.pipe(validator)
    : intValidator
  const validationResult = combinedValidator?.safeDecode(draft.value)
  const validationError = validationResult.error?.issues?.[0]?.message
  const save = async () => {
    if (!validationResult.success) {
      ref.current?.shake()
    } else {
      setDraft({ value: draft.value, isSaving: true })
      const result = await onSave(validationResult.data)
      setDraft({ value: draft.value, isSaving: false })
      if (result.success) {
        setDraft(null)
        ref.current?.deselect()
      } else {
        ref.current?.shake()
        setTimeout(() => ref.current?.focus(false))
        setSaveError(result.error)
      }
    }
  }
  const cancel = () => {
    ref.current?.deselect()
    setDraft(null)
  }
  const onChange = (value: string) => {
    const strippedValue = value.replace(nonNumberRegex, "")
    setDraft({ value: strippedValue, isSaving: draft.isSaving })
  }
  return (
    <BaseInput
      label={label}
      editing={true}
      inputMode="numeric"
      value={draft.value}
      isSaving={draft.isSaving}
      onChange={onChange}
      onSave={save}
      onCancel={cancel}
      error={saveError ?? validationError}
      ref={ref}
    />
  )
}
