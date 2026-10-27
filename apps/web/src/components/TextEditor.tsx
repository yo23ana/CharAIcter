import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import type { Finding } from '@charaicter/shared/analyzer'

import type { Highlight } from '../lib/selection'

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

export function TextEditor({
  highlights,
  onChange,
  onScroll,
  onSubmit,
  reveal,
  scrollPosition,
  text,
}: {
  highlights: Finding[]
  onChange: (value: string) => void
  onScroll: (scrollLeft: number, scrollTop: number) => void
  onSubmit: () => void
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
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            onSubmit()
          }
        }}
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
