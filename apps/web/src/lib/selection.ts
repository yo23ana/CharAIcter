import type { KeyboardEvent } from 'react'

import type { Finding } from '@charaicter/shared/analyzer'

/** Findings highlighted together: one finding, or a group such as every comma. */
export interface Highlight {
  findings: Finding[]
  key: string
}

export function highlightOf(finding: Finding): Highlight {
  return {
    findings: [finding],
    key: `${finding.category}:${finding.startOffset}:${finding.endOffset}`,
  }
}

/** Callbacks for previewing (hover) and pinning (click) a highlight. */
export interface SelectionHandlers {
  onHover: (highlight: Highlight | null) => void
  onSelect: (highlight: Highlight) => void
}

/**
 * The handlers stay the same object for the whole session, so memoized
 * components that receive only them do not re-render when the selection
 * changes.
 */
export interface FindingSelection {
  handlers: SelectionHandlers
  selectedKey: string | null
}

// Hover previews a highlight; click pins it so it stays while the user
// scrolls. Clicking a pinned item again unpins it.
export function selectableProps(
  highlight: Highlight,
  { onHover, onSelect }: SelectionHandlers,
  isSelected: boolean,
) {
  return {
    'aria-pressed': isSelected,
    className: `finding selectable-finding${isSelected ? ' is-selected' : ''}`,
    onBlur: () => onHover(null),
    onClick: () => onSelect(highlight),
    onFocus: () => onHover(highlight),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect(highlight)
      }
    },
    onMouseEnter: () => onHover(highlight),
    onMouseLeave: () => onHover(null),
    role: 'button',
    tabIndex: 0,
  }
}

export function isFindingSelected(
  finding: Finding,
  selection: FindingSelection,
) {
  return highlightOf(finding).key === selection.selectedKey
}
