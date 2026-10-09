import {
  BaseInput,
  type BaseInputHandle,
} from "@family-tree/components/inputs/BaseInput"
import { useRef, useState } from "react"
import { z } from "zod"

export type SaveResult = { success: true } | { success: false; error: string }

export type DraftType = { value: string; isSaving: boolean } | null

export interface DraftTextInput {
  label: string
  value: string
  onSave: (value: string) => SaveResult | Promise<SaveResult>
  validator?: z.ZodString | undefined
}

export function DraftTextInput({
  label,
  value,
  onSave,
  validator,
}: DraftTextInput) {
  const [draft, setDraftState] = useState<DraftType>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const ref = useRef<BaseInputHandle>(null)

  function setDraft(value: DraftType) {
    setDraftState(value)
    setSaveError(null)
  }

  if (draft === null) {
    return (
      <BaseInput
        label={label}
        editing={false}
        value={value}
        onStartEditing={() => {
          setDraft({ value, isSaving: false })
          ref.current?.focus()
        }}
        ref={ref}
      />
    )
  }
  const validationError = validator?.safeDecode(draft.value)?.error?.issues?.[0]
    ?.message
  const save = async () => {
    if (validationError) {
      ref.current?.shake()
    } else {
      setDraft({ value: draft.value, isSaving: true })
      const result = await onSave(draft.value)
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
  return (
    <BaseInput
      label={label}
      editing={true}
      value={draft.value}
      isSaving={draft.isSaving}
      onChange={(value) => setDraft({ value, isSaving: draft.isSaving })}
      onSave={save}
      onCancel={cancel}
      error={saveError ?? validationError}
      ref={ref}
    />
  )
}
