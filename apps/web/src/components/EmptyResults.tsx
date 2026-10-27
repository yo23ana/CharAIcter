export function EmptyResults({
  hasText,
  isAnalyzing,
}: {
  hasText: boolean
  isAnalyzing: boolean
}) {
  return (
    <div className="placeholder-card">
      <span aria-hidden="true" className="placeholder-icon">
        ¶
      </span>
      <p className="placeholder-title">
        {isAnalyzing ? 'Analyzing…' : 'Results appear here'}
      </p>
      <p className="placeholder-copy">
        {isAnalyzing
          ? 'Checking characters, whitespace, symbols, and language.'
          : hasText
            ? 'Press Analyze text, or Ctrl + Enter, to inspect your text.'
            : 'Paste or type text on the left, then press Analyze text.'}
      </p>
    </div>
  )
}
