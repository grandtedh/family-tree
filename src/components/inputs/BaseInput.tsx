import { isSelectionIn, shake } from "@family-tree/utils/imperative"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit"
import SyncIcon from "@mui/icons-material/Sync"
import {
  IconButton,
  InputAdornment,
  TextField,
  type TouchRippleActions,
} from "@mui/material"
import React, { useId, useImperativeHandle, useRef, type Ref } from "react"
import styles from "./styles.module.css"

export interface BaseInputHandle {
  shake: () => void
  focus: (forceSelect?: boolean | undefined) => void
  deselect: () => void
}

export interface BaseInputProps {
  label: string
  value: string
  error?: string | undefined
  inputMode?: "numeric" | "text" | undefined
  ref?: Ref<BaseInputHandle> | undefined
}

export interface DraftingInputProps extends BaseInputProps {
  editing: true
  isSaving: boolean
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export interface PolishedInputProps extends BaseInputProps {
  editing: false
  onStartEditing: () => void
}

export interface EditableInputProps extends BaseInputProps {
  editing?: undefined
  onChange: (value: string) => void
}

export function BaseInput({
  ref,
  ...rest
}: DraftingInputProps | PolishedInputProps | EditableInputProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const textFieldRef = useRef<HTMLDivElement>(null)
  const touchRippleRef = useRef<TouchRippleActions>(null)
  useImperativeHandle(
    ref,
    () => ({
      shake: () => shake(textFieldRef.current),
      focus: (forceSelect = true) => {
        const shouldSelect =
          forceSelect || document.activeElement !== inputRef.current
        inputRef.current?.focus()
        if (shouldSelect) {
          inputRef.current?.select()
        }
      },
      deselect: () => {
        const selection = window.getSelection()
        if (isSelectionIn(textFieldRef.current, selection)) {
          selection?.removeAllRanges()
        }
      },
    }),
    [],
  )

  let adornment
  let handleKeyDown
  if (rest.editing === true) {
    adornment = (
      <InputAdornment position="end">
        <IconButton
          aria-label="Cancel"
          aria-controls={id}
          onClick={rest.onCancel}
          onPointerDown={(e) => e.preventDefault()}
        >
          <CloseIcon />
        </IconButton>
        {
          <IconButton
            aria-label={rest.isSaving ? "Saving..." : "Save"}
            aria-controls={id}
            onClick={() => {
              rest.onSave()
              touchRippleRef.current?.pulsate()
            }}
            onPointerDown={(e) => e.preventDefault()}
            disabled={rest.isSaving}
            touchRippleRef={touchRippleRef}
          >
            {rest.isSaving ? (
              <SyncIcon className={styles.spin} />
            ) : (
              <CheckIcon />
            )}
          </IconButton>
        }
      </InputAdornment>
    )
    handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        rest.onSave()
        e.preventDefault()
      } else if (e.key === "Escape") {
        rest.onCancel()
        e.preventDefault()
      }
    }
  } else if (rest.editing === false) {
    adornment = (
      <InputAdornment position="end">
        <IconButton
          aria-label="Edit"
          aria-controls={id}
          onClick={rest.onStartEditing}
          onPointerDown={(e) => e.preventDefault()}
        >
          <EditIcon />
        </IconButton>
      </InputAdornment>
    )
  }

  return (
    <TextField
      label={rest.label}
      id={id}
      value={rest.value}
      error={rest.error !== undefined}
      helperText={rest.error}
      onChange={
        "onChange" in rest
          ? (e) => rest.onChange(e.currentTarget.value)
          : undefined
      }
      slotProps={{
        htmlInput: {
          onKeyDown: handleKeyDown,
          inputMode: rest.inputMode ?? "text",
          pattern: rest.inputMode === "numeric" ? "[0-9]-" : undefined,
        },
        input: {
          readOnly: rest.editing === false,
          endAdornment: adornment,
        },
      }}
      ref={textFieldRef}
      inputRef={inputRef}
    />
  )
}
