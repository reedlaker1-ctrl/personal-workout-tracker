import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Unit } from '../db/db'
import { LineChart } from '../components/LineChart'
import { num, shortDate } from '../util/format'

interface Props {
  exerciseKey: string
  unit: Unit
  onBack: () => void
}

export function ExerciseDetail({ exerciseKey, unit, onBack }: Props) {
  const logs =
    useLiveQuery(
      () => db.logs.where('exerciseKey').equals(exerciseKey).toArray(),
      [exerciseKey],
    ) ?? []

  const sorted = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1))
  const points = sorted.map((l) => ({ date: l.date, value: l.weight }))
  const desc = [...sorted].reverse()

  const deleteEntry = async (id: number) => {
    await db.logs.delete(id)
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-back" onClick={onBack} aria-label="Back">‹</button>
        <h1 className="screen-title" style={{ fontSize: 20 }}>{exerciseKey}</h1>
      </div>

      <div className="chart-wrap">
        <LineChart points={points} height={180} />
      </div>

      {desc.length === 0 && (
        <div className="empty">No logs yet — go lift something.</div>
      )}

      {desc.length > 0 && (
        <div className="card" style={{ padding: '4px 14px', marginTop: 12 }}>
          {desc.map((e) => (
            <div key={e.id} className="entry-row">
              <span className="entry-val">{num(e.weight)} {unit}</span>
              <span className="entry-date">{shortDate(e.date)}</span>
              <button
                className="btn-icon"
                style={{ fontSize: 15, color: 'var(--danger)', padding: '4px 0 4px 10px' }}
                aria-label="Delete"
                onClick={() => e.id != null && deleteEntry(e.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
