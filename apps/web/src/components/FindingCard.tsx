import { memo } from 'react'

import type { Finding } from '@charaicter/shared/analyzer'

import {
  categoryLabels,
  findingCode,
  findingLocation,
  findingValue,
  severityLabels,
  showsWhitespaceMarkers,
  visibleWhitespace,
} from '../lib/format'
import {
  highlightOf,
  isFindingSelected,
  selectableProps,
  type FindingSelection,
  type SelectionHandlers,
} from '../lib/selection'

function FindingExcerpt({ finding }: { finding: Finding }) {
  const show = showsWhitespaceMarkers(finding)
    ? visibleWhitespace
    : (part: string) => part
  // Highlight by recorded offset, not by searching, so repeated characters
  // such as the second hyphen in "A--" are marked at the right place.
  const matchStart = finding.excerptStart
  const matchEnd = matchStart + finding.value.length

  return (
    <>
      {show(finding.excerpt.slice(0, matchStart))}
      <mark className="finding-highlight">
        {show(finding.excerpt.slice(matchStart, matchEnd))}
      </mark>
      {show(finding.excerpt.slice(matchEnd))}
    </>
  )
}

// Memoized: with stable handlers, only cards whose selection changed
// re-render, even when the list holds thousands of findings.
const FindingCard = memo(function FindingCard({
  finding,
  handlers,
  isSelected,
}: {
  finding: Finding
  handlers: SelectionHandlers
  isSelected: boolean
}) {
  return (
    <li {...selectableProps(highlightOf(finding), handlers, isSelected)}>
      <div className="finding-topline">
        <span className={`severity severity-${finding.severity}`}>
          {severityLabels[finding.severity]}
        </span>
        <span className="finding-category">
          {categoryLabels[finding.category]}
        </span>
      </div>
      <p className="finding-description">{finding.description}</p>
      <div className="finding-meta">
        <code>{findingCode(finding)}</code>
        <span>{findingLocation(finding)}</span>
        {showsWhitespaceMarkers(finding) ? (
          <span
            aria-label={`Visible whitespace representation: ${visibleWhitespace(finding.value)}`}
            className="finding-value whitespace-marker"
            title="Visible whitespace representation"
          >
            {findingValue(finding)}
          </span>
        ) : (
          <span className="finding-value">{findingValue(finding)}</span>
        )}
      </div>
      <p className="finding-excerpt">
        <FindingExcerpt finding={finding} />
      </p>
    </li>
  )
})

export function FindingList({
  findings,
  selection,
}: {
  findings: Finding[]
  selection: FindingSelection
}) {
  return (
    <ul className="finding-list">
      {findings.map((finding, index) => (
        <FindingCard
          finding={finding}
          handlers={selection.handlers}
          isSelected={isFindingSelected(finding, selection)}
          key={`${finding.startOffset}-${finding.category}-${index}`}
        />
      ))}
    </ul>
  )
}
