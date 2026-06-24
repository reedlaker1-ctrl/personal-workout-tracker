import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addMetric, type Unit } from '../db/db'
import { getSplit } from '../config/splits'
import { Sheet } from '../components/Sheet'
import { LineChart } from '../components/LineChart'
import { Photos } from './Photos'
import { num, shortDate } from '../util/format'

interface Props {
  unit: Unit
  splitId: string
  onOpenMetric: (id: number) => void
  onOpenExercise: (key: string) => void
}

type Seg = 'exercises' | 'metrics' | 'photos'

export function Progress({ unit, splitId, onOpenMetric, onOpenExercise }: Props) {
  const [seg, setSeg] = useState<Seg>('exercises')

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Progress</h1>
      </div>

      <div className="seg-tabs">
        <button className={`seg-tab${seg === 'exercises' ? ' active' : ''}`} onClick={() => setSeg('exercises')}>Exercises</button>
        <button className={`seg-tab${seg === 'metrics' ? ' active' : ''}`} onClick={() => setSeg('metrics')}>Metrics</button>
        <button className={`seg-tab${seg === 'photos' ? ' active' : ''}`} onClick={() => setSeg('photos')}>Photos</button>
      </div>

      {seg === 'exercises' && (
        <ExercisesList splitId={splitId} unit={unit} onOpenExercise={onOpenExercise} />
      )}
      {seg === 'metrics' && (
        <MetricsList unit={unit} onOpenMetric={onOpenMetric} />
      )}
      {seg === 'photos' && <Photos />}
    </div>
  )
}

function ExercisesList({
  splitId,
  unit,
  onOpenExercise,
}: {
  splitId: string
  unit: Unit
  onOpenExercise: (key: string) => void
}) {
  const split = getSplit(splitId)
  const allLogs = useLiveQuery(() => db.logs.toArray(), []) ?? []

  if (!split) return <div className="empty">No split configured.</div>

  return (
    <>
      {split.days.map((day, di) => (
        <div key={day.id}>
          <div className="ex-group-header" style={di === 0 ? { marginTop: 0 } : undefined}>
            {day.name}
          </div>
          {day.exercises.map((name) => {
            const logs = allLogs
              .filter((l) => l.exerciseKey === name)
              .sort((a, b) => (a.date < b.date ? -1 : 1))
            const points = logs.map((l) => ({ date: l.date, value: l.weight }))
            const latest = logs[logs.length - 1]

            return (
              <button key={name} className="metric-card" onClick={() => onOpenExercise(name)}>
                <span className="metric-info">
                  <div className="metric-name">{name}</div>
                  <div className="metric-latest">
                    {latest
                      ? `${num(latest.weight)} ${unit} · ${shortDate(latest.date)}`
                      : 'No logs yet'}
                  </div>
                </span>
                {points.length > 0 && (
                  <span style={{ width: 90, flex: 'none' }}>
                    <LineChart points={points} height={40} sparkline />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </>
  )
}

function MetricsList({
  unit,
  onOpenMetric,
}: {
  unit: Unit
  onOpenMetric: (id: number) => void
}) {
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
