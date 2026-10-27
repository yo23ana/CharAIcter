import { memo, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { AnalysisResult } from '@charaicter/shared/analysis'
import type { FindingSeverity } from '@charaicter/shared/analyzer'

import { splitFindings, uniqueDetections } from '../lib/findingGroups'
import { severityLabels } from '../lib/format'
import type { FindingSelection } from '../lib/selection'
import { AllDetectionsTab } from './AllDetectionsTab'
import { FindingList } from './FindingCard'
import { SymbolsTab } from './SymbolsTab'

type Tab = 'all' | 'dash' | 'findings' | 'symbols'

const severityOrder: FindingSeverity[] = ['high', 'medium', 'low', 'info']

// Memoized: hovering a finding changes only the editor's highlight, so the
// results panel does not need to re-render.
export const Results = memo(function Results({
  analysis,
  selection,
}: {
  analysis: AnalysisResult
  selection: FindingSelection
}) {
  const { findings, language } = analysis
  const [tab, setTab] = useState<Tab>('findings')
  const [showWhitespace, setShowWhitespace] = useState(true)
  const [severity, setSeverity] = useState<FindingSeverity | null>(null)
  const { dashes, main, symbols } = useMemo(
    () => splitFindings(findings),
    [findings],
  )
  const allDetections = useMemo(() => uniqueDetections(findings), [findings])
  const visibleFindings = useMemo(
    () =>
      main.filter(
        (finding) =>
          (showWhitespace || finding.category !== 'whitespace') &&
          (severity === null || finding.severity === severity),
      ),
    [main, severity, showWhitespace],
  )
  const severityCounts = useMemo(() => {
    const counts = new Map<FindingSeverity, number>()
    for (const finding of main) {
      counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1)
    }
    return counts
  }, [main])
  const tabs: { count: number; id: Tab; label: string }[] = [
    { count: main.length, id: 'findings', label: 'Findings' },
    { count: dashes.length, id: 'dash', label: 'Dashes' },
    { count: symbols.length, id: 'symbols', label: 'Symbols' },
    { count: allDetections.length, id: 'all', label: 'All' },
  ]

  // Arrow keys move between tabs, as in a standard tab list.
  function handleTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const index = tabs.findIndex((candidate) => candidate.id === tab)
    const step = event.key === 'ArrowRight' ? 1 : -1
    const next = tabs[(index + step + tabs.length) % tabs.length].id
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <div className="results">
      <div className="results-summary">
        <p className="language-result">
          {language.confidence === 'low' ? 'Best language match' : 'Language'}
          {': '}
          <strong>{language.name}</strong>
          {language.languages !== undefined && (
            <span> ({language.languages.join(', ')})</span>
          )}
          {language.confidence === 'low' && <span> · low confidence</span>}
        </p>
        <h3 id="results-title">
          {main.length === 0
            ? 'Nothing unusual found.'
            : `${main.length} finding${main.length === 1 ? '' : 's'} to review`}
        </h3>
        {main.length > 0 && (
          <div
            aria-label="Filter findings by severity"
            className="severity-summary"
          >
            {severityOrder.map((level) => {
              const count = severityCounts.get(level) ?? 0
              return (
                <button
                  aria-pressed={severity === level}
                  className={`severity-pill severity-${level}`}
                  disabled={count === 0}
                  key={level}
                  onClick={() => {
                    setSeverity((current) => (current === level ? null : level))
                    setTab('findings')
                  }}
                  type="button"
                >
                  <strong>{count}</strong> {severityLabels[level]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div
        aria-label="Result views"
        className="tabs"
        onKeyDown={handleTabKey}
        role="tablist"
      >
        {tabs.map((candidate) => (
          <button
            aria-controls="results-panel"
            aria-selected={tab === candidate.id}
            className="tab"
            id={`tab-${candidate.id}`}
            key={candidate.id}
            onClick={() => setTab(candidate.id)}
            role="tab"
            tabIndex={tab === candidate.id ? 0 : -1}
            type="button"
          >
            {candidate.label}
            <span className="tab-count">{candidate.count}</span>
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`tab-${tab}`}
        className="tab-panel"
        id="results-panel"
        role="tabpanel"
      >
        {tab === 'findings' && (
          <>
            <div className="panel-toolbar">
              <p className="panel-description">
                Click a finding to keep it highlighted in your text.
              </p>
              {main.some((finding) => finding.category === 'whitespace') && (
                <button
                  aria-pressed={showWhitespace}
                  className="chip"
                  onClick={() => setShowWhitespace((isVisible) => !isVisible)}
                  type="button"
                >
                  Show whitespace
                </button>
              )}
            </div>
            {visibleFindings.length > 0 ? (
              <FindingList findings={visibleFindings} selection={selection} />
            ) : (
              <p className="empty-panel">
                {main.length === 0
                  ? 'Nothing unusual found. Dashes and symbols are in their own tabs.'
                  : 'No findings match the current filters.'}
              </p>
            )}
          </>
        )}
        {tab === 'dash' &&
          (dashes.length > 0 ? (
            <>
              <p className="panel-description">
                Every dash and hyphen, including the ordinary keyboard hyphen,
                with its exact position.
              </p>
              <FindingList findings={dashes} selection={selection} />
            </>
          ) : (
            <p className="empty-panel">No dash characters found.</p>
          ))}
        {tab === 'symbols' &&
          (symbols.length > 0 ? (
            <SymbolsTab findings={symbols} selection={selection} />
          ) : (
            <p className="empty-panel">No symbols found.</p>
          ))}
        {tab === 'all' && (
          <AllDetectionsTab findings={allDetections} selection={selection} />
        )}
      </div>
    </div>
  )
})
