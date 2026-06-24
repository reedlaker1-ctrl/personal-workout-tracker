import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  addMetricEntry,
  deleteMetricEntry,
  deleteMetric,
  type Unit,
} from '../db/db'
import { LineChart } from '../components/LineChart'
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

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1))
  const desc = [...sorted].reverse()

  const add = async () => {
    const v = parseFloat(val)
    if (!isFinite(v)) return
    await addMetricEntry(metricId, v)
    setVal('')
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-back" onClick={onBack} aria-label="Back">‹</button>
        <h1 className="screen-title">{metric?.name ?? ''}</h1>
        <button
          className="btn-icon"
          aria-label="Delete metric"
          onClick={async () => {
            if (confirm(`Delete "${metric?.name}" and all its entries?`)) {
              await deleteMetric(metricId)
              onBack()
            }
          }}
        >
          🗑
        </button>
      </div>

      <div className="chart-wrap">
        <LineChart points={sorted} height={180} />
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        <input
          className="field"
          style={{ marginBottom: 0 }}
          type="number"
          inputMode="decimal"
          placeholder={`New value (${unit})`}
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
              {num(e.value)} {unit}
            </span>
            <span className="entry-date">{shortDate(e.date)}</span>
            <button
              className="btn-icon"
              style={{ fontSize: 16 }}
              aria-label="Delete entry"
              onClick={() => deleteMetricEntry(e.id!)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
