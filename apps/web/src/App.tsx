import { useMemo, useState } from 'react'

import type { AnalysisResult } from '@charaicter/shared/analysis'

import { analyzeTextWithApi } from './api'
import { EmptyResults } from './components/EmptyResults'
import { Results } from './components/Results'
import { TextEditor } from './components/TextEditor'
import type {
  FindingSelection,
  Highlight,
  SelectionHandlers,
} from './lib/selection'

export function App() {
  const [text, setText] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hovered, setHovered] = useState<Highlight | null>(null)
  const [selected, setSelected] = useState<Highlight | null>(null)
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 })
  // Created once, so memoized results and cards skip re-rendering on hover.
  const handlers = useMemo<SelectionHandlers>(
    () => ({
      onHover: setHovered,
      onSelect: (highlight) =>
        setSelected((current) =>
          current?.key === highlight.key ? null : highlight,
        ),
    }),
    [],
  )
  const selectedKey = selected?.key ?? null
  const selection = useMemo<FindingSelection>(
    () => ({ handlers, selectedKey }),
    [handlers, selectedKey],
  )

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

  const canAnalyze = text.length > 0 && !isAnalyzing

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 id="page-title">Meet CharAIcter.</h1>
        <p>Find hidden, unusual, and lookalike characters in any text.</p>
      </header>

      <div className="workspace">
        <section aria-label="Text to inspect" className="editor-pane">
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
            onSubmit={() => {
              if (canAnalyze) void handleAnalyze()
            }}
            reveal={selected}
            scrollPosition={scrollPosition}
            text={text}
          />
          <div className="input-footer">
            <span>{text.length.toLocaleString()} characters</span>
            <span className="input-actions">
              <kbd className="shortcut-hint">Ctrl + Enter</kbd>
              <button
                disabled={!canAnalyze}
                onClick={() => void handleAnalyze()}
                type="button"
              >
                {isAnalyzing ? 'Analyzing…' : 'Analyze text'}
              </button>
            </span>
          </div>
          {error !== null && (
            <p aria-live="polite" className="analysis-error" role="alert">
              {error}
            </p>
          )}
        </section>

        <section aria-label="Results" className="results-pane">
          {analysis !== null ? (
            <Results analysis={analysis} selection={selection} />
          ) : (
            <EmptyResults hasText={text.length > 0} isAnalyzing={isAnalyzing} />
          )}
        </section>
      </div>

      <footer>
        <span>Private by design.</span>
        <span>Built for careful reading.</span>
      </footer>
    </main>
  )
}
