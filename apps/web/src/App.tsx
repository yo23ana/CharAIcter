import { Fragment, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { AnalysisResult } from '@charAIcter/shared/analysis'
import type { Finding } from '@charAIcter/shared/analyzer'

import { analyzeTextWithApi } from './api'
import { dashFindings, nonDashFindings } from './dashInspector'

const categoryLabels = {
  control: 'Control character',
  dash: 'Dash character',
  'hidden-text': 'Hidden text',
  invisible: 'Invisible character',
  line: 'Line structure',
  lookalike: 'Lookalike characters',
  'mixed-script': 'Mixed-script word',
  'private-use': 'Private-use character',
  replacement: 'Replacement character',
  symbol: 'Symbol',
  whitespace: 'Whitespace',
} as const

const severityLabels = {
  info: 'Information',
  high: 'High attention',
  low: 'Low attention',
  medium: 'Review',
} as const

function visibleWhitespace(value: string) {
  return Array.from(value)
    .map((character) => {
      if (character === ' ') return '·'
      if (character === '\t') return '⇥'
      if (character === '\n') return '↵'
      if (character === '\r') return '␍'
      if (/\s/u.test(character)) {
        const codePoint = character.codePointAt(0)
        return codePoint === undefined
          ? '□'
          : `⟦U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}⟧`
      }
      return character
    })
    .join('')
}

function showsWhitespaceMarkers(finding: Finding) {
  return finding.category === 'whitespace' || finding.category === 'line'
}

function findingValue(finding: Finding) {
  if (finding.category === 'hidden-text') {
    return `${Array.from(finding.value).length} hidden characters`
  }
  return showsWhitespaceMarkers(finding)
    ? visibleWhitespace(finding.value)
    : JSON.stringify(finding.value)
}

function findingCode(finding: Finding) {
  if (finding.codePoint !== undefined) return finding.codePoint
  return finding.category === 'line' ? 'Line' : 'Word'
}

function findingLocation(finding: Finding) {
  if (finding.endLine > finding.line) {
    return `Lines ${finding.line}–${finding.endLine}`
  }
  if (finding.lineType === 'empty') return `Line ${finding.line}`

  const positions =
    finding.lineEndPosition > finding.linePosition
      ? `positions ${finding.linePosition}–${finding.lineEndPosition}`
      : `position ${finding.linePosition}`
  return `Line ${finding.line}, ${positions}`
}

function FindingExcerpt({ finding }: { finding: Finding }) {
  const show = showsWhitespaceMarkers(finding)
    ? visibleWhitespace
    : (part: string) => part
  // Highlight by recorded offset, not by searching, so repeated characters
  // such as the second hyphen in "A--" are marked at the right place.
  const matchStart = finding.excerptStart
  const matchEnd = matchStart + finding.value.length

  return (
    <Fragment>
      {show(finding.excerpt.slice(0, matchStart))}
      <mark className="finding-highlight">
        {show(finding.excerpt.slice(matchStart, matchEnd))}
      </mark>
      {show(finding.excerpt.slice(matchEnd))}
    </Fragment>
  )
}

interface FindingSelection {
  onHover: (finding: Finding | null) => void
  onSelect: (finding: Finding) => void
  selected: Finding | null
}

// Hover previews a finding; click pins it so the highlight stays while the
// user scrolls. Clicking a pinned finding again unpins it.
function selectableFindingProps(
  finding: Finding,
  { onHover, onSelect, selected }: FindingSelection,
) {
  const isSelected = finding === selected
  return {
    'aria-pressed': isSelected,
    className: `finding selectable-finding${isSelected ? ' is-selected' : ''}`,
    onBlur: () => onHover(null),
    onClick: () => onSelect(finding),
    onFocus: () => onHover(finding),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect(finding)
      }
    },
    onMouseEnter: () => onHover(finding),
    onMouseLeave: () => onHover(null),
    role: 'button',
    tabIndex: 0,
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function TextEditor({
  activeFinding,
  onChange,
  onScroll,
  revealFinding,
  scrollPosition,
  text,
}: {
  activeFinding: Finding | null
  onChange: (value: string) => void
  onScroll: (scrollLeft: number, scrollTop: number) => void
  revealFinding: Finding | null
  scrollPosition: { left: number; top: number }
  text: string
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Bring a newly pinned finding into view, both on the page and inside the
  // textarea's own scroll area.
  useEffect(() => {
    const mark = overlayRef.current?.querySelector('mark')
    const textarea = textareaRef.current
    if (revealFinding === null || !mark || !textarea) return

    textarea.scrollTop = Math.max(0, mark.offsetTop - textarea.clientHeight / 3)
    textarea.scrollLeft = Math.max(
      0,
      mark.offsetLeft - textarea.clientWidth / 2,
    )
    editorRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [revealFinding])

  const range = activeFinding
    ? {
        end: activeFinding.endOffset,
        start: activeFinding.startOffset,
      }
    : null
  const before = range === null ? text : text.slice(0, range.start)
  const highlighted = range === null ? '' : text.slice(range.start, range.end)
  const after = range === null ? '' : text.slice(range.end)

  return (
    <div
      className={`text-editor${range === null ? '' : ' has-highlight'}`}
      ref={editorRef}
    >
      {range !== null && (
        <div
          aria-hidden="true"
          className="text-overlay"
          ref={overlayRef}
          style={{
            transform: `translate(${-scrollPosition.left}px, ${-scrollPosition.top}px)`,
          }}
        >
          {before}
          {activeFinding?.category === 'line' ? (
            // Empty lines have no visible text, so mark each line with a bar.
            highlighted.split(/(\r\n|\r|\n)/).map((part, index) =>
              index % 2 === 1 ? (
                part
              ) : (
                <mark
                  className="editor-highlight editor-highlight-line"
                  key={index}
                >
                  {part}
                </mark>
              ),
            )
          ) : (
            <mark className="editor-highlight">{highlighted}</mark>
          )}
          {after}
        </div>
      )}
      <textarea
        aria-label="Text to inspect"
        id="text-input"
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) =>
          onScroll(
            event.currentTarget.scrollLeft,
            event.currentTarget.scrollTop,
          )
        }
        placeholder="Paste or type text here..."
        ref={textareaRef}
        rows={8}
        value={text}
      />
    </div>
  )
}

export function App() {
  const [text, setText] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hoveredFinding, setHoveredFinding] = useState<Finding | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 })
  const selection: FindingSelection = {
    onHover: setHoveredFinding,
    onSelect: (finding) =>
      setSelectedFinding((current) => (current === finding ? null : finding)),
    selected: selectedFinding,
  }

  async function handleAnalyze() {
    setError(null)
    setIsAnalyzing(true)
    setHoveredFinding(null)
    setSelectedFinding(null)

    try {
      setAnalysis(await analyzeTextWithApi(text))
    } catch (requestError) {
      setAnalysis(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Analysis failed. Please try again.',
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <h1 id="page-title">Meet CharAIcter.</h1>
      </section>

      <section className="workspace" aria-labelledby="workspace-title">
        <h2 className="visually-hidden" id="workspace-title">
          Text analysis
        </h2>
        <div className="input-area">
          <label htmlFor="text-input">Text to inspect</label>
          <TextEditor
            activeFinding={hoveredFinding ?? selectedFinding}
            onChange={(value) => {
              setText(value)
              setAnalysis(null)
              setError(null)
              setHoveredFinding(null)
              setSelectedFinding(null)
            }}
            onScroll={(left, top) => setScrollPosition({ left, top })}
            revealFinding={selectedFinding}
            scrollPosition={scrollPosition}
            text={text}
          />
          <div className="input-footer">
            <span>{text.length} characters</span>
            <button
              disabled={!text || isAnalyzing}
              onClick={() => void handleAnalyze()}
              type="button"
            >
              {isAnalyzing ? 'Analyzing…' : 'Analyze text'}
            </button>
          </div>
        </div>
        {error !== null && (
          <p aria-live="polite" className="analysis-error" role="alert">
            {error}
          </p>
        )}
        {analysis !== null && (
          <Results analysis={analysis} selection={selection} />
        )}
      </section>

      <footer>
        <span>Private by design.</span>
        <span>Built for careful reading.</span>
      </footer>
    </main>
  )
}

type Panel = 'all' | 'dash' | 'symbols'

/** Most rows the "all detections" table renders at once. */
const MAX_TABLE_ROWS = 1000

function isSymbolFinding(finding: Finding) {
  return finding.category === 'symbol'
}

function Results({
  analysis,
  selection,
}: {
  analysis: AnalysisResult
  selection: FindingSelection
}) {
  const { findings } = analysis
  const [showWhitespace, setShowWhitespace] = useState(true)
  const [openPanel, setOpenPanel] = useState<Panel | null>(null)
  const allDashFindings = dashFindings(findings)
  const symbolFindings = findings.filter(isSymbolFinding)
  const mainFindings = nonDashFindings(findings).filter(
    (finding) => !isSymbolFinding(finding),
  )
  const visibleFindings = showWhitespace
    ? mainFindings
    : mainFindings.filter((finding) => finding.category !== 'whitespace')
  const panels: { count: number; hint: string; id: Panel; label: string }[] = [
    {
      count: allDashFindings.length,
      hint: 'Dash characters and their exact positions.',
      id: 'dash',
      label: 'Dash Inspector',
    },
    {
      count: symbolFindings.length,
      hint: 'Every character that is not a letter or digit.',
      id: 'symbols',
      label: 'Symbols',
    },
    {
      count: findings.length,
      hint: 'Everything the app detected, in one table.',
      id: 'all',
      label: 'Show all detections',
    },
  ]

  return (
    <section aria-labelledby="results-title" className="results">
      <div className="results-heading">
        <div>
          <p className="language-result">
            {analysis.language.confidence === 'low'
              ? 'Best language match:'
              : 'Detected language:'}{' '}
            <strong>{analysis.language.name}</strong>
            {analysis.language.languages !== undefined && (
              <span> ({analysis.language.languages.join(', ')})</span>
            )}
            {analysis.language.confidence === 'low' && (
              <span> (low confidence)</span>
            )}
          </p>
          <h3 id="results-title">
            {visibleFindings.length === 0
              ? mainFindings.length === 0
                ? 'Nothing unusual found.'
                : 'Whitespace details are hidden.'
              : `${visibleFindings.length} finding${visibleFindings.length === 1 ? '' : 's'} to review.`}
          </h3>
        </div>
        <span className="result-count">{visibleFindings.length}</span>
      </div>
      {findings.length > 0 && (
        <p className="selection-hint">
          Click a finding to keep it highlighted in your text. Click it again to
          clear the highlight.
        </p>
      )}
      {findings.some((finding) => finding.category === 'whitespace') && (
        <div className="results-controls">
          <button
            aria-pressed={showWhitespace}
            className="toggle-button"
            onClick={() => setShowWhitespace((isVisible) => !isVisible)}
            type="button"
          >
            {showWhitespace ? 'Hide' : 'Show'} whitespace details
          </button>
          <span>
            Includes visible markers for spaces and Unicode whitespace.
          </span>
        </div>
      )}
      <div className="panel-controls">
        {panels.map((panel) => (
          <button
            aria-expanded={openPanel === panel.id}
            className="toggle-button"
            disabled={panel.count === 0}
            key={panel.id}
            onClick={() =>
              setOpenPanel((current) =>
                current === panel.id ? null : panel.id,
              )
            }
            title={panel.hint}
            type="button"
          >
            {panel.label} ({panel.count})
          </button>
        ))}
      </div>
      {openPanel === 'dash' && (
        <Inspector
          description="Each occurrence is shown with its original position."
          findings={allDashFindings}
          selection={selection}
          title="Dash Inspector"
        />
      )}
      {openPanel === 'symbols' && (
        <SymbolInspector findings={symbolFindings} selection={selection} />
      )}
      {openPanel === 'all' && (
        <AllDetections findings={findings} selection={selection} />
      )}
      {visibleFindings.length > 0 && (
        <ul className="finding-list">
          {visibleFindings.map((finding, index) => (
            <FindingCard
              finding={finding}
              key={`${finding.startOffset}-${finding.category}-${index}`}
              selection={selection}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function FindingCard({
  finding,
  selection,
}: {
  finding: Finding
  selection: FindingSelection
}) {
  return (
    <li {...selectableFindingProps(finding, selection)}>
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
}

function Inspector({
  description,
  findings,
  selection,
  title,
}: {
  description: string
  findings: Finding[]
  selection: FindingSelection
  title: string
}) {
  return (
    <section aria-label={title} className="inspector">
      <div className="inspector-heading">
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        <span className="result-count">{findings.length}</span>
      </div>
      <ul className="finding-list">
        {findings.map((finding, index) => (
          <FindingCard
            finding={finding}
            key={`${finding.startOffset}-${finding.category}-${index}`}
            selection={selection}
          />
        ))}
      </ul>
    </section>
  )
}

type SymbolKind = NonNullable<Finding['symbolKind']>

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
function SymbolInspector({
  findings,
  selection,
}: {
  findings: Finding[]
  selection: FindingSelection
}) {
  const [kind, setKind] = useState<SymbolKind | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const groups = groupSymbols(findings)
  const kindCounts = new Map<SymbolKind, number>()
  for (const group of groups) {
    kindCounts.set(
      group.kind,
      (kindCounts.get(group.kind) ?? 0) + group.occurrences.length,
    )
  }
  const shown =
    kind === null ? groups : groups.filter((group) => group.kind === kind)

  return (
    <section aria-label="Symbols" className="inspector">
      <div className="inspector-heading">
        <div>
          <h4>Symbols</h4>
          <p>
            Every character that is not a letter or digit: punctuation,
            brackets, quotes, dashes, currency, math, emoji, and more. Click a
            symbol to see where it appears.
          </p>
        </div>
        <span className="result-count">{groups.length}</span>
      </div>
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
              return (
                <Fragment key={group.value}>
                  <tr
                    aria-expanded={isExpanded}
                    className={isExpanded ? 'is-selected' : undefined}
                    onClick={() => {
                      setExpanded(isExpanded ? null : group.value)
                      // Highlight the first place it occurs; onSelect toggles,
                      // so skip it when that place is already pinned.
                      if (!isExpanded && selection.selected !== first) {
                        selection.onSelect(first)
                      }
                    }}
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
                            .map((finding) => (
                              <li
                                key={finding.startOffset}
                                {...selectableFindingProps(finding, selection)}
                                className={`occurrence${finding === selection.selected ? ' is-selected' : ''}`}
                                title={finding.excerpt}
                              >
                                {findingLocation(finding)}
                              </li>
                            ))}
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
    </section>
  )
}

function tableValue(finding: Finding) {
  if (showsWhitespaceMarkers(finding)) return visibleWhitespace(finding.value)
  if (
    finding.category === 'hidden-text' ||
    finding.category === 'invisible' ||
    finding.category === 'control'
  ) {
    return '⟦hidden⟧'
  }
  return finding.value
}

function AllDetections({
  findings,
  selection,
}: {
  findings: Finding[]
  selection: FindingSelection
}) {
  const [category, setCategory] = useState<Finding['category'] | null>(null)
  const counts = new Map<Finding['category'], number>()
  for (const finding of findings) {
    counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1)
  }
  const shown =
    category === null
      ? findings
      : findings.filter((finding) => finding.category === category)
  const rows = shown.slice(0, MAX_TABLE_ROWS)

  return (
    <section aria-label="All detections" className="inspector">
      <div className="inspector-heading">
        <div>
          <h4>All detections</h4>
          <p>
            Everything the app found, in text order. Click a row to highlight
            it.
          </p>
        </div>
        <span className="result-count">{findings.length}</span>
      </div>
      <div className="chip-row">
        <button
          aria-pressed={category === null}
          className="chip"
          onClick={() => setCategory(null)}
          type="button"
        >
          All ({findings.length})
        </button>
        {[...counts.entries()].map(([key, count]) => (
          <button
            aria-pressed={category === key}
            className="chip"
            key={key}
            onClick={() => setCategory(key)}
            type="button"
          >
            {categoryLabels[key]} ({count})
          </button>
        ))}
      </div>
      <div className="detections-table-wrap">
        <table className="detections-table">
          <thead>
            <tr>
              <th scope="col">Found</th>
              <th scope="col">Code</th>
              <th scope="col">Type</th>
              <th scope="col">Severity</th>
              <th scope="col">Where</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((finding, index) => (
              <tr
                key={`${finding.startOffset}-${finding.category}-${index}`}
                {...selectableFindingProps(finding, selection)}
                className={
                  finding === selection.selected ? 'is-selected' : undefined
                }
                title={finding.description}
              >
                <td className="detections-value">{tableValue(finding)}</td>
                <td>
                  <code>{findingCode(finding)}</code>
                </td>
                <td>{categoryLabels[finding.category]}</td>
                <td>
                  <span className={`severity severity-${finding.severity}`}>
                    {severityLabels[finding.severity]}
                  </span>
                </td>
                <td>{findingLocation(finding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > rows.length && (
        <p className="selection-hint">
          Showing the first {rows.length.toLocaleString()} of{' '}
          {shown.length.toLocaleString()}. Pick a type above to narrow the list.
        </p>
      )}
    </section>
  )
}
