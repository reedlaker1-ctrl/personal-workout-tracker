import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addMetric, type Unit } from '../db/db'
import { Sheet } from '../components/Sheet'
import { LineChart } from '../components/LineChart'
import { Photos } from './Photos'
import { num, shortDate } from '../util/format'

interface Props {
  unit: Unit
  onOpenMetric: (id: number) => void
}

export function Progress({ unit, onOpenMetric }: Props) {
  const [seg, setSeg] = useState<'metrics' | 'photos'>('metrics')

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Progress</h1>
      </div>

      <div className="row" style={{ marginBottom: 18 }}>
        <button
          className={`btn${seg === 'metrics' ? ' btn-accent' : ''}`}
          onClick={() => setSeg('metrics')}
        >
          Metrics
        </button>
        <button
          className={`btn${seg === 'photos' ? ' btn-accent' : ''}`}
          onClick={() => setSeg('photos')}
        >
          Photos
        </button>
      </div>

      {seg === 'metrics' ? (
        <MetricsList unit={unit} onOpenMetric={onOpenMetric} />
      ) : (
        <Photos />
      )}
    </div>
  )
}

function MetricsList({ unit, onOpenMetric }: Props) {
  const metrics = useLiveQuery(() => db.metrics.toArray(), []) ?? []
  const entries = useLiveQuery(() => db.metricEntries.toArray(), []) ?? []
  const [adding, setAdding] = useState(false)

  return (
    <>
      {metrics.length === 0 && (
        <div className="empty">
          Track anything over time — bodyweight, max bench, max squat…
        </div>
      )}

      {metrics.map((m) => {
        const pts = entries
          .filter((e) => e.metricId === m.id)
          .sort((a, b) => (a.date < b.date ? -1 : 1))
        const latest = pts[pts.length - 1]
        return (
          <button key={m.id} className="metric-card" onClick={() => onOpenMetric(m.id!)}>
            <span className="metric-info">
              <div className="metric-name">{m.name}</div>
              <div className="metric-latest">
                {latest
                  ? `${num(latest.value)} ${unit} · ${shortDate(latest.date)}`
                  : 'No entries yet'}
              </div>
            </span>
            <span style={{ width: 90, flex: 'none' }}>
              <LineChart points={pts} height={40} sparkline />
            </span>
          </button>
        )
      })}

      <button className="btn btn-full fab-row" onClick={() => setAdding(true)}>
        + Add metric
      </button>

      {adding && <AddMetricSheet onClose={() => setAdding(false)} />}
    </>
  )
}

function AddMetricSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const save = async () => {
    if (!name.trim()) return
    await addMetric(name)
    onClose()
  }
  return (
    <Sheet title="New metric" onClose={onClose}>
      <input
        className="field"
        autoFocus
        placeholder="e.g. Bodyweight, Max Bench"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button className="btn btn-accent btn-full" onClick={save}>
        Add
      </button>
    </Sheet>
  )
}
