import { Fragment, useState } from 'react'

import type { Finding } from './analyzer'
import { analyzeText } from './analyzer'

const categoryLabels = {
  control: 'Control character',
  invisible: 'Invisible character',
  'mixed-script': 'Mixed-script word',
  replacement: 'Replacement character',
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

function findingValue(finding: Finding) {
  return finding.category === 'whitespace'
    ? visibleWhitespace(finding.value)
    : JSON.stringify(finding.value)
}

function FindingExcerpt({ finding }: { finding: Finding }) {
  const excerpt =
    finding.category === 'whitespace'
      ? visibleWhitespace(finding.excerpt)
      : finding.excerpt

  if (finding.category !== 'mixed-script') {
    return <>{excerpt}</>
  }

  const matchStart = finding.excerpt.indexOf(finding.value)
  if (matchStart < 0) {
    return <>{excerpt}</>
  }

  const matchEnd = matchStart + finding.value.length
  return (
    <Fragment>
      {finding.excerpt.slice(0, matchStart)}
      <mark className="finding-highlight">
        {finding.excerpt.slice(matchStart, matchEnd)}
      </mark>
      {finding.excerpt.slice(matchEnd)}
    </Fragment>
  )
}

export function App() {
  const [text, setText] = useState('')
  const [findings, setFindings] = useState<Finding[] | null>(null)

  function handleAnalyze() {
    setFindings(analyzeText(text))
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
          <textarea
            id="text-input"
            onChange={(event) => {
              setText(event.target.value)
              setFindings(null)
            }}
            placeholder="Paste or type text here..."
            rows={8}
            value={text}
          />
          <div className="input-footer">
            <span>{text.length} characters</span>
            <button disabled={!text} onClick={handleAnalyze} type="button">
              Analyze text
            </button>
          </div>
        </div>
        {findings !== null && <Results findings={findings} />}
      </section>

      <footer>
        <span>Private by design.</span>
        <span>Built for careful reading.</span>
      </footer>
    </main>
  )
}

function Results({ findings }: { findings: Finding[] }) {
  const [showWhitespace, setShowWhitespace] = useState(true)
  const visibleFindings = showWhitespace
    ? findings
    : findings.filter((finding) => finding.category !== 'whitespace')

  return (
    <section aria-labelledby="results-title" className="results">
      <div className="results-heading">
        <div>
          <h3 id="results-title">
            {visibleFindings.length === 0
              ? findings.length === 0
                ? 'Nothing unusual found.'
                : 'Whitespace details are hidden.'
              : `${visibleFindings.length} finding${visibleFindings.length === 1 ? '' : 's'} to review.`}
          </h3>
        </div>
        <span className="result-count">{visibleFindings.length}</span>
      </div>
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
      {visibleFindings.length > 0 && (
        <ul className="finding-list">
          {visibleFindings.map((finding, index) => (
            <li
              className="finding"
              key={`${finding.position}-${finding.category}-${index}`}
            >
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
                <code>{finding.codePoint ?? 'Word'}</code>
                <span>Position {finding.position}</span>
                {finding.category === 'whitespace' ? (
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
          ))}
        </ul>
      )}
    </section>
  )
}
