import { Fragment, useMemo, useState } from 'react'

import type { Finding, SymbolKind } from '@charaicter/shared/analyzer'

import { findingLocation } from '../lib/format'
import {
  highlightOf,
  isFindingSelected,
  selectableProps,
  type FindingSelection,
  type Highlight,
} from '../lib/selection'

const symbolKindLabels: Record<SymbolKind, string> = {
  bracket: 'Brackets',
  currency: 'Currency',
  dash: 'Dashes',
  emoji: 'Emoji',
  math: 'Math',
  number: 'Numbers',
  other: 'Other',
  punctuation: 'Punctuation',
  quote: 'Quotes',
}

/** Most occurrences listed under one expanded symbol. */
const MAX_OCCURRENCES = 200

interface SymbolGroup {
  kind: SymbolKind
  occurrences: Finding[]
  value: string
}

function groupSymbols(findings: Finding[]) {
  const groups = new Map<string, SymbolGroup>()
  for (const finding of findings) {
    const group = groups.get(finding.value) ?? {
      kind: finding.symbolKind ?? 'other',
      occurrences: [],
      value: finding.value,
    }
    group.occurrences.push(finding)
    groups.set(finding.value, group)
  }
  return [...groups.values()].sort(
    (left, right) => right.occurrences.length - left.occurrences.length,
  )
}

// Lists each distinct symbol once with its count; expanding a symbol shows
// every place it occurs.
export function SymbolsTab({
  findings,
  selection,
}: {
  findings: Finding[]
  selection: FindingSelection
}) {
  const [kind, setKind] = useState<SymbolKind | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const groups = useMemo(() => groupSymbols(findings), [findings])
  const kindCounts = useMemo(() => {
    const counts = new Map<SymbolKind, number>()
    for (const group of groups) {
      counts.set(
        group.kind,
        (counts.get(group.kind) ?? 0) + group.occurrences.length,
      )
    }
    return counts
  }, [groups])
  const shown =
    kind === null ? groups : groups.filter((group) => group.kind === kind)
  const { onHover, onSelect } = selection.handlers

  return (
    <>
      <p className="panel-description">
        {groups.length} different symbols: every character that is not a letter
        or digit. Click one to highlight all its places in your text.
      </p>
      <div className="chip-row">
        <button
          aria-pressed={kind === null}
          className="chip"
          onClick={() => setKind(null)}
          type="button"
        >
          All ({findings.length})
        </button>
        {[...kindCounts.entries()].map(([key, count]) => (
          <button
            aria-pressed={kind === key}
            className="chip"
            key={key}
            onClick={() => setKind(key)}
            type="button"
          >
            {symbolKindLabels[key]} ({count})
          </button>
        ))}
      </div>
      <div className="detections-table-wrap">
        <table className="detections-table">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Name</th>
              <th scope="col">Code</th>
              <th scope="col">Count</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((group) => {
              const [first] = group.occurrences
              const isExpanded = expanded === group.value
              const highlight: Highlight = {
                findings: group.occurrences,
                key: `symbol:${group.value}`,
              }
              const isSelected = selection.selectedKey === highlight.key
              return (
                <Fragment key={group.value}>
                  <tr
                    aria-expanded={isExpanded}
                    className={isExpanded ? 'is-selected' : undefined}
                    // Opening a symbol highlights every place it occurs;
                    // closing it clears that highlight.
                    onClick={() => {
                      setExpanded(isExpanded ? null : group.value)
                      if (isExpanded === isSelected) onSelect(highlight)
                    }}
                    onMouseEnter={() => onHover(highlight)}
                    onMouseLeave={() => onHover(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.currentTarget.click()
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="detections-value">{group.value}</td>
                    <td>{first.symbolName}</td>
                    <td>
                      <code>{first.codePoint}</code>
                    </td>
                    <td>{group.occurrences.length}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="occurrence-row">
                      <td colSpan={4}>
                        <ul className="occurrence-list">
                          {group.occurrences
                            .slice(0, MAX_OCCURRENCES)
                            .map((finding) => {
                              const isOccurrenceSelected = isFindingSelected(
                                finding,
                                selection,
                              )
                              return (
                                <li
                                  key={finding.startOffset}
                                  {...selectableProps(
                                    highlightOf(finding),
                                    selection.handlers,
                                    isOccurrenceSelected,
                                  )}
                                  className={`occurrence${isOccurrenceSelected ? ' is-selected' : ''}`}
                                  title={finding.excerpt}
                                >
                                  {findingLocation(finding)}
                                </li>
                              )
                            })}
                        </ul>
                        {group.occurrences.length > MAX_OCCURRENCES && (
                          <p className="selection-hint">
                            Showing the first {MAX_OCCURRENCES} of{' '}
                            {group.occurrences.length} places.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
