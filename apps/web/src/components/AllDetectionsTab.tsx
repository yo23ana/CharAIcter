import { useMemo, useState } from 'react'

import type { Finding } from '@charaicter/shared/analyzer'

import { groupDetections } from '../lib/findingGroups'
import {
  categoryLabels,
  findingCode,
  findingLocation,
  severityLabels,
  tableValue,
} from '../lib/format'
import {
  selectableProps,
  type FindingSelection,
  type Highlight,
} from '../lib/selection'

/** Most rows the table renders at once. */
const MAX_TABLE_ROWS = 1000

export function AllDetectionsTab({
  findings,
  selection,
}: {
  findings: Finding[]
  selection: FindingSelection
}) {
  const [category, setCategory] = useState<Finding['category'] | null>(null)
  const counts = useMemo(() => {
    const byCategory = new Map<Finding['category'], number>()
    for (const finding of findings) {
      byCategory.set(
        finding.category,
        (byCategory.get(finding.category) ?? 0) + 1,
      )
    }
    return byCategory
  }, [findings])
  const groups = useMemo(
    () =>
      groupDetections(
        category === null
          ? findings
          : findings.filter((finding) => finding.category === category),
      ),
    [category, findings],
  )
  const rows = groups.slice(0, MAX_TABLE_ROWS)

  return (
    <>
      <p className="panel-description">
        Everything the app found, in text order. Repeated items share one row;
        click a row to highlight every place it occurs.
      </p>
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
              const isSelected = highlight.key === selection.selectedKey
              const count = group.findings.length
              return (
                <tr
                  key={group.key}
                  {...selectableProps(
                    highlight,
                    selection.handlers,
                    isSelected,
                  )}
                  className={isSelected ? 'is-selected' : undefined}
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
    </>
  )
}
