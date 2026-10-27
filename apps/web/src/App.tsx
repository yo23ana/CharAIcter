import { Fragment, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

import type { AnalysisResult } from '@charAIcter/shared/analysis'
import type { Finding } from '@charAIcter/shared/analyzer'

import { analyzeTextWithApi } from './api'
import { groupDetections, uniqueDetections } from './allDetections'
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

/** Findings highlighted together: one finding, or a group such as every comma. */
interface Highlight {
  findings: Finding[]
  key: string
}

function highlightOf(finding: Finding): Highlight {
  return {
    findings: [finding],
    key: `${finding.category}:${finding.startOffset}:${finding.endOffset}`,
  }
}

interface FindingSelection {
  onHover: (highlight: Highlight | null) => void
  onSelect: (highlight: Highlight) => void
  selectedKey: string | null
}

// Hover previews a highlight; click pins it so it stays while the user
// scrolls. Clicking a pinned item again unpins it.
function selectableProps(
  highlight: Highlight,
  { onHover, onSelect, selectedKey }: FindingSelection,
) {
  const isSelected = highlight.key === selectedKey
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

function selectableFindingProps(finding: Finding, selection: FindingSelection) {
  return selectableProps(highlightOf(finding), selection)
}

function HighlightMark({ finding, text }: { finding: Finding; text: string }) {
  const value = text.slice(finding.startOffset, finding.endOffset)
  if (finding.category !== 'line') {
    return <mark className="editor-highlight">{value}</mark>
  }
  // Empty lines have no visible text, so mark each line with a bar.
  return (
    <>
      {value.split(/(\r\n|\r|\n)/).map((part, index) =>
        index % 2 === 1 ? (
          part
        ) : (
          <mark className="editor-highlight editor-highlight-line" key={index}>
            {part}
          </mark>
        ),
      )}
    </>
  )
}

/** The text with every highlighted finding wrapped in a mark. */
function highlightedText(text: string, findings: Finding[]) {
  const nodes: ReactNode[] = []
  let cursor = 0
  for (const finding of [...findings].sort(
    (left, right) => left.startOffset - right.startOffset,
  )) {
    // Overlapping findings are drawn once.
    if (finding.startOffset < cursor) continue
    nodes.push(text.slice(cursor, finding.startOffset))
    nodes.push(
      <HighlightMark finding={finding} key={finding.startOffset} text={text} />,
    )
    cursor = finding.endOffset
  }
  nodes.push(text.slice(cursor))
  return nodes
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function TextEditor({
  highlights,
  onChange,
  onScroll,
  reveal,
  scrollPosition,
  text,
}: {
  highlights: Finding[]
  onChange: (value: string) => void
  onScroll: (scrollLeft: number, scrollTop: number) => void
  reveal: Highlight | null
  scrollPosition: { left: number; top: number }
  text: string
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Bring a newly pinned highlight into view (its first occurrence), both on
  // the page and inside the textarea's own scroll area.
  useEffect(() => {
    const mark = overlayRef.current?.querySelector('mark')
    const textarea = textareaRef.current
    if (reveal === null || !mark || !textarea) return

    textarea.scrollTop = Math.max(0, mark.offsetTop - textarea.clientHeight / 3)
    textarea.scrollLeft = Math.max(
      0,
      mark.offsetLeft - textarea.clientWidth / 2,
    )
    editorRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [reveal])

  const hasHighlight = highlights.length > 0

  return (
    <div
      className={`text-editor${hasHighlight ? ' has-highlight' : ''}`}
      ref={editorRef}
    >
      {hasHighlight && (
        <div
          aria-hidden="true"
          className="text-overlay"
          ref={overlayRef}
          style={{
            transform: `translate(${-scrollPosition.left}px, ${-scrollPosition.top}px)`,
          }}
        >
          {highlightedText(text, highlights)}
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
  const [hovered, setHovered] = useState<Highlight | null>(null)
  const [selected, setSelected] = useState<Highlight | null>(null)
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 })
  const selection: FindingSelection = {
    onHover: setHovered,
    onSelect: (highlight) =>
      setSelected((current) =>
        current?.key === highlight.key ? null : highlight,
      ),
    selectedKey: selected?.key ?? null,
  }

  async function handleAnalyze() {
    setError(null)
    setIsAnalyzing(true)
    setHovered(null)
    setSelected(null)

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
            highlights={(hovered ?? selected)?.findings ?? []}
            onChange={(value) => {
              setText(value)
              setAnalysis(null)
              setError(null)
              setHovered(null)
              setSelected(null)
            }}
            onScroll={(left, top) => setScrollPosition({ left, top })}
            reveal={selected}
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
  const allDetections = uniqueDetections(findings)
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
      count: allDetections.length,
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
        <AllDetections findings={allDetections} selection={selection} />
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
                      if (isExpanded === isSelected)
                        selection.onSelect(highlight)
                    }}
                    onMouseEnter={() => selection.onHover(highlight)}
                    onMouseLeave={() => selection.onHover(null)}
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
                                className={`occurrence${highlightOf(finding).key === selection.selectedKey ? ' is-selected' : ''}`}
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
  const groups = groupDetections(
    category === null
      ? findings
      : findings.filter((finding) => finding.category === category),
  )
  const rows = groups.slice(0, MAX_TABLE_ROWS)

  return (
    <section aria-label="All detections" className="inspector">
      <div className="inspector-heading">
        <div>
          <h4>All detections</h4>
          <p>
            Everything the app found, in text order. Repeated items share one
            row; click a row to highlight every place it occurs.
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
              <th scope="col">Count</th>
              <th scope="col">Where</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((group) => {
              const [first] = group.findings
              const highlight: Highlight = {
                findings: group.findings,
                key: `all:${group.key}`,
              }
              const count = group.findings.length
              return (
                <tr
                  key={group.key}
                  {...selectableProps(highlight, selection)}
                  className={
                    highlight.key === selection.selectedKey
                      ? 'is-selected'
                      : undefined
                  }
                  title={first.description}
                >
                  <td className="detections-value">{tableValue(first)}</td>
                  <td>
                    <code>{findingCode(first)}</code>
                  </td>
                  <td>{categoryLabels[first.category]}</td>
                  <td>
                    <span className={`severity severity-${first.severity}`}>
                      {severityLabels[first.severity]}
                    </span>
                  </td>
                  <td>{count}</td>
                  <td>
                    {count === 1
                      ? findingLocation(first)
                      : `First: ${findingLocation(first)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {groups.length > rows.length && (
        <p className="selection-hint">
          Showing the first {rows.length.toLocaleString()} of{' '}
          {groups.length.toLocaleString()} rows. Pick a type above to narrow the
          list.
        </p>
      )}
    </section>
  )
}
