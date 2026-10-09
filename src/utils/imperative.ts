export function shake(animatable?: Animatable | null | undefined) {
  animatable?.animate(
    {
      transform: [
        "translateX(0)",
        "translateX(-4px)",
        "translateX(4px)",
        "translateX(-4px)",
        "translateX(4px)",
        "translateX(0)",
      ],
    },
    400,
  )
}

export function isSelectionIn(
  node?: Node | null | undefined,
  selection = window.getSelection(),
) {
  if (!node) {
    return false
  }
  if (!selection) {
    return
  }
  return [...Array(selection.rangeCount).keys()].every((i) => {
    const range = selection.getRangeAt(i)
    return (
      node.contains(range.startContainer) && node.contains(range.endContainer)
    )
  })
}
