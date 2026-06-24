import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSplit } from '../config/splits'
import {
  db,
  logWeight,
  deleteTodayLog,
  addCustomExercise,
  removeCustomExercise,
  todayISO,
  type Unit,
  type WorkoutLog,
} from '../db/db'
import { Sheet } from '../components/Sheet'
import { relativeDate, num } from '../util/format'

interface Props {
  splitId: string
  dayId: string
  unit: Unit
  onBack: () => void
}

interface Item {
  name: string
  customId?: number
}

export function Checklist({ splitId, dayId, unit, onBack }: Props) {
  const day = getSplit(splitId)?.days.find((d) => d.id === dayId)

  const custom =
    useLiveQuery(() => db.customExercises.where('dayId').equals(dayId).toArray(), [dayId]) ?? []
  const logs =
    useLiveQuery(() => db.logs.where('dayId').equals(dayId).toArray(), [dayId]) ?? []

  const [editing, setEditing] = useState<Item | null>(null)
  const [adding, setAdding] = useState(false)

  const items: Item[] = useMemo(() => {
    const base = (day?.exercises ?? []).map((name) => ({ name }))
    const extra = custom.map((c) => ({ name: c.name, customId: c.id }))
    return [...base, ...extra]
  }, [day, custom])

  const today = todayISO()
  const logsFor = (name: string) => logs.filter((l) => l.exerciseKey === name)
  const todayLog = (name: string): WorkoutLog | undefined =>
    logsFor(name)
      .filter((l) => l.date === today)
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0]
  const priorLog = (name: string): WorkoutLog | undefined =>
    logsFor(name)
      .filter((l) => l.date < today)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]

  if (!day) {
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="icon-back" onClick={onBack}>‹</button>
          <h1 className="screen-title">Not found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-back" onClick={onBack} aria-label="Back">‹</button>
        <h1 className="screen-title">{day.name}</h1>
      </div>

      {items.map((it) => {
        const t = todayLog(it.name)
        const p = priorLog(it.name)
        return (
          <button
            key={it.name + (it.customId ?? '')}
            className={`ex-row${t ? ' done' : ''}`}
            onClick={() => setEditing(it)}
          >
            <span className={`ex-check${t ? ' on' : ''}`}>✓</span>
            <span className="ex-main">
              <div className="ex-name">{it.name}</div>
              {t ? (
                <div className="ex-today">Today · {num(t.weight)} {unit}</div>
              ) : p ? (
                <div className="ex-prior">
                  Last: {num(p.weight)} {unit} · {relativeDate(p.date)}
                </div>
              ) : (
                <div className="ex-prior">No history yet</div>
              )}
            </span>
            {t && <span className="ex-weight">{num(t.weight)}</span>}
          </button>
        )
      })}

      <button className="btn btn-full fab-row" onClick={() => setAdding(true)}>
        + Add workout
      </button>

      {editing && (
        <LogSheet
          item={editing}
          unit={unit}
          dayId={dayId}
          existing={todayLog(editing.name)}
          onClose={() => setEditing(null)}
        />
      )}

      {adding && (
        <AddSheet dayId={dayId} onClose={() => setAdding(false)} />
      )}
    </div>
  )
}

function LogSheet({
  item,
  unit,
  dayId,
  existing,
  onClose,
}: {
  item: Item
  unit: Unit
  dayId: string
  existing?: WorkoutLog
  onClose: () => void
}) {
  const [val, setVal] = useState(existing ? num(existing.weight) : '')

  const save = async () => {
    const w = parseFloat(val)
    if (!isFinite(w)) return
    await logWeight(item.name, dayId, w)
    onClose()
  }

  return (
    <Sheet title={item.name} onClose={onClose}>
      <input
        className="field"
        type="number"
        inputMode="decimal"
        autoFocus
        placeholder={`Weight (${unit})`}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <div className="row">
        {existing && (
          <button
            className="btn"
            onClick={async () => {
              await deleteTodayLog(item.name)
              onClose()
            }}
          >
            Clear
          </button>
        )}
        <button className="btn btn-accent" onClick={save}>
          {existing ? 'Update' : 'Save'}
        </button>
      </div>
      {item.customId != null && (
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <button
            className="del-link"
            onClick={async () => {
              await removeCustomExercise(item.customId!)
              onClose()
            }}
          >
            Remove this exercise
          </button>
        </div>
      )}
    </Sheet>
  )
}

function AddSheet({ dayId, onClose }: { dayId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const save = async () => {
    if (!name.trim()) return
    await addCustomExercise(dayId, name)
    onClose()
  }
  return (
    <Sheet title="Add workout" onClose={onClose}>
      <input
        className="field"
        autoFocus
        placeholder="Exercise name"
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
