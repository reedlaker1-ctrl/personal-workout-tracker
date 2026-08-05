import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  addMetricEntry,
  deleteMetricEntry,
  deleteMetric,
  type Unit,
} from '../db/db'
import { LineChart } from '../components/LineChart'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { num, shortDate } from '../util/format'

interface Props {
  metricId: number
  unit: Unit
  onBack: () => void
}

export function MetricDetail({ metricId, unit, onBack }: Props) {
  const metric = useLiveQuery(() => db.metrics.get(metricId), [metricId])
  const entries =
    useLiveQuery(
      () => db.metricEntries.where('metricId').equals(metricId).toArray(),
      [metricId],
    ) ?? []
  const [val, setVal] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingEntryId, setConfirmingEntryId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isReps = metric?.kind === 'reps'
  const metricUnit = isReps ? 'reps' : unit

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1))
  const desc = [...sorted].reverse()
  const confirmingEntry = desc.find((e) => e.id === confirmingEntryId)

  const add = async () => {
    const v = parseFloat(val)
    if (!isFinite(v)) return
    await addMetricEntry(metricId, v)
    setVal('')
  }

  // iOS's decimal numeric keypad has no minus key, so negative entry (for
  // assisted exercises tracked as a metric) needs an explicit toggle.
  const toggleSign = () => {
    setVal((v) => (v.startsWith('-') ? v.slice(1) : v ? `-${v}` : v))
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-back" onClick={onBack} aria-label="Back">‹</button>
        <h1 className="screen-title">{metric?.name ?? ''}</h1>
        <button
          className="btn-icon"
          aria-label="Delete metric"
          onClick={() => setConfirmingDelete(true)}
        >
          🗑
        </button>
      </div>

      <div className="chart-wrap">
        <LineChart points={sorted} height={180} unit={metricUnit} />
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        {!isReps && (
          <button
            type="button"
            className="btn sign-toggle"
            aria-label="Toggle negative (for assisted exercises)"
            onClick={toggleSign}
          >
            ±
          </button>
        )}
        <input
          ref={inputRef}
          className="field"
          style={{ marginBottom: 0 }}
          type="number"
          inputMode="decimal"
          placeholder={`New value (${metricUnit})`}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn btn-accent" style={{ flex: 'none' }} onClick={add}>
          Add
        </button>
      </div>

      {desc.length === 0 && <div className="empty">No entries yet.</div>}

      <div className="card" style={{ padding: '4px 16px', marginTop: 12 }}>
        {desc.map((e) => (
          <div key={e.id} className="entry-row">
            <span className="entry-val">
              {num(e.value)} {metricUnit}
            </span>
            <span className="entry-date">{shortDate(e.date)}</span>
            <button
              className="btn-icon"
              style={{ fontSize: 16 }}
              aria-label="Delete entry"
              onClick={() => setConfirmingEntryId(e.id!)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {confirmingDelete && (
        <ConfirmSheet
          title="Delete metric?"
          message={`"${metric?.name}" and all its entries will be removed.`}
          onConfirm={async () => { await deleteMetric(metricId); onBack() }}
          onClose={() => setConfirmingDelete(false)}
        />
      )}

      {confirmingEntry && (
        <ConfirmSheet
          title="Delete entry?"
          message={`${num(confirmingEntry.value)} ${metricUnit} on ${shortDate(confirmingEntry.date)} will be removed.`}
          onConfirm={() => deleteMetricEntry(confirmingEntry.id!)}
          onClose={() => setConfirmingEntryId(null)}
        />
      )}
    </div>
  )
}
