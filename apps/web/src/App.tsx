import { useState } from 'react'

import type { Finding } from './analyzer'
import { analyzeText } from './analyzer'

const categoryLabels = {
  control: 'Control character',
  invisible: 'Invisible character',
  'mixed-script': 'Mixed-script word',
  replacement: 'Replacement character',
  whitespace: 'Unusual whitespace',
} as const

const severityLabels = {
  high: 'High attention',
  low: 'Low attention',
  medium: 'Review',
} as const

export function App() {
  const [text, setText] = useState('')
  const [findings, setFindings] = useState<Finding[] | null>(null)

  function handleAnalyze() {
    setFindings(analyzeText(text))
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Unicode clarity, one character at a time</p>
        <h1 id="page-title">Meet CharAIcter.</h1>
        <p className="intro">
          A focused workspace for understanding the subtle characters hiding in
          plain text.
        </p>
      </section>

      <section className="workspace" aria-labelledby="workspace-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Workspace</p>
            <h2 id="workspace-title">Bring your text into focus.</h2>
          </div>
          <span className="status-pill">Local analysis</span>
        </div>
        <div className="input-area">
          <label htmlFor="text-input">Text to inspect</label>
          <textarea
            id="text-input"
            onChange={(event) => setText(event.target.value)}
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
  return (
    <section aria-labelledby="results-title" className="results">
      <div className="results-heading">
        <div>
          <p className="section-kicker">Analysis results</p>
          <h3 id="results-title">
            {findings.length === 0
              ? 'Nothing unusual found.'
              : `${findings.length} finding${findings.length === 1 ? '' : 's'} to review.`}
          </h3>
        </div>
        <span className="result-count">{findings.length}</span>
      </div>
      {findings.length > 0 && (
        <ul className="finding-list">
          {findings.map((finding, index) => (
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
                <span className="finding-value">
                  {JSON.stringify(finding.value)}
                </span>
              </div>
              <p className="finding-excerpt">{finding.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
