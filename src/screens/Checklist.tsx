import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Split } from '../config/splits'
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
  split: Split
  dayId: string
  unit: Unit
  onBack: () => void
}

interface Item {
  name: string
  customId?: number
}

export function Checklist({ split, dayId, unit, onBack }: Props) {
  const day = split.days.find((d) => d.id === dayId)

  const custom =
    useLiveQuery(() => db.customExercises.where('dayId').equals(dayId).toArray(), [dayId]) ?? []

  // Day-scoped: determines "done today" checkmark and recency sort within this day
  const dayLogs =
    useLiveQuery(() => db.logs.where('dayId').equals(dayId).toArray(), [dayId]) ?? []

  // All logs: used for cross-day prior weight lookups
  const allLogs = useLiveQuery(() => db.logs.toArray(), []) ?? []

  const [editing, setEditing] = useState<Item | null>(null)
  const [adding, setAdding] = useState(false)

  const today = todayISO()

  // Hidden-for-day: exercises swiped away reappear automatically the next day.
  // `today` is recomputed on every render so an overnight open app self-corrects on next interaction.
  const [hiddenForDay, setHiddenForDay] = useState<{ date: string; names: Set<string> }>({
    date: today,
    names: new Set(),
  })
  const hidden = hiddenForDay.date === today ? hiddenForDay.names : new Set<string>()
  const hideExercise = (name: string) =>
    setHiddenForDay({ date: today, names: new Set([...hidden, name]) })
  const restoreAll = () => setHiddenForDay({ date: today, names: new Set() })

  // Swipe gesture state
  const [activeDrag, setActiveDrag] = useState<{ name: string; dx: number } | null>(null)
  const touchStartX = useRef(0)
  const hasMoved = useRef(false)

  const onSwipeTouchStart = (name: string, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    hasMoved.current = false
    setActiveDrag({ name, dx: 0 })
  }

  const onSwipeTouchMove = (name: string, e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 5) hasMoved.current = true
    if (dx < 0) setActiveDrag((prev) => (prev?.name === name ? { name, dx } : prev))
  }

  const onSwipeTouchEnd = (name: string) => {
    if (activeDrag?.name === name && activeDrag.dx < -80) {
      hideExercise(name)
    }
    setActiveDrag(null)
  }

  const items: Item[] = useMemo(() => {
    const base = (day?.exercises ?? []).map((name) => ({ name }))
    const extra = custom.map((c) => ({ name: c.name, customId: c.id }))
    return [...base, ...extra]
  }, [day, custom])

  const dayLogsFor = (name: string) => dayLogs.filter((l) => l.exerciseKey === name)
  const allLogsFor = (name: string) => allLogs.filter((l) => l.exerciseKey === name)

  const todayLog = (name: string): WorkoutLog | undefined =>
    dayLogsFor(name)
      .filter((l) => l.date === today)
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0]

  const priorLog = (name: string): WorkoutLog | undefined =>
    allLogsFor(name)
      .filter((l) => l.date < today)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]

  const priorMax = (name: string): number | undefined => {
    const priors = allLogsFor(name).filter((l) => l.date < today)
    if (priors.length === 0) return undefined
    return Math.max(...priors.map((l) => l.weight))
  }

  const sortedItems = useMemo(() => {
    const latestDate = (name: string) => {
      const dates = dayLogs.filter((l) => l.exerciseKey === name).map((l) => l.date)
      return dates.length ? [...dates].sort().reverse()[0] : ''
    }
    return [...items].sort((a, b) => {
      const ra = latestDate(a.name)
      const rb = latestDate(b.name)
      if (ra === rb) return a.name.localeCompare(b.name)
      return rb > ra ? 1 : -1
    })
  }, [items, dayLogs])

  const doneCount = items.filter((it) => !!todayLog(it.name)).length
  const isComplete = doneCount > 0 && doneCount === items.length

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

      {isComplete && (
        <div className="complete-banner">
          🎉 All done — great work!
        </div>
      )}

      {sortedItems.filter((it) => !hidden.has(it.name)).map((it) => {
        const t = todayLog(it.name)
        const p = priorLog(it.name)
        const max = priorMax(it.name)
        const isPR = t != null && (max == null || t.weight > max)
        const isDragging = activeDrag?.name === it.name
        const dx = isDragging ? Math.min(0, activeDrag!.dx) : 0

        return (
          <div
            key={it.name + (it.customId ?? '')}
            className="ex-swipe-wrap"
            onTouchStart={(e) => onSwipeTouchStart(it.name, e)}
            onTouchMove={(e) => onSwipeTouchMove(it.name, e)}
            onTouchEnd={() => onSwipeTouchEnd(it.name)}
          >
            {isDragging && <div className="ex-skip-bg">Skip</div>}
            <button
              className={`ex-row${t ? ' done' : ''}`}
              style={{
                transform: `translateX(${dx}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease',
              }}
              onClick={() => { if (!hasMoved.current) setEditing(it) }}
            >
              <span className={`ex-check${t ? ' on' : ''}`}>✓</span>
              <span className="ex-main">
                <div className="ex-name">{it.name}</div>
                {t ? (
                  <div className="ex-today">Today · {num(t.weight)} {unit}</div>
                ) : p ? (
                  <div className="ex-prior">Last: {num(p.weight)} {unit} · {relativeDate(p.date)}</div>
                ) : (
                  <div className="ex-prior">No history yet</div>
                )}
              </span>
              {t && (
                isPR
                  ? <span className="pr-badge">PR</span>
                  : <span className="ex-weight">{num(t.weight)}</span>
              )}
            </button>
          </div>
        )
      })}

      {hidden.size > 0 && (
        <button className="btn btn-ghost btn-full" onClick={restoreAll}>
          {hidden.size} skipped · Restore
        </button>
      )}

      <button className="btn btn-ghost btn-full fab-row" onClick={() => setAdding(true)}>
        + Add exercise
      </button>

      {editing && (
        <LogSheet
          item={editing}
          unit={unit}
          dayId={dayId}
          existing={todayLog(editing.name)}
          prior={priorLog(editing.name)}
          onClose={() => setEditing(null)}
        />
      )}

      {adding && (
        <AddSheet dayId={dayId} onClose={() => setAdding(false)} />
      )}
    </div>
  )
}

const PLATE_WEIGHTS = [45, 35, 25, 10, 5, 2.5]
const BAR_WEIGHT = 45
const ADJUSTMENTS = [-10, -5, +5, +10]

function LogSheet({
  item,
  unit,
  dayId,
  existing,
  prior,
  onClose,
}: {
  item: Item
  unit: Unit
  dayId: string
  existing?: WorkoutLog
  prior?: WorkoutLog
  onClose: () => void
}) {
  const [mode, setMode] = useState<'weight' | 'plates'>('weight')
  const [val, setVal] = useState(
    existing ? num(existing.weight) : prior ? num(prior.weight) : ''
  )
  const [counts, setCounts] = useState<Record<number, number>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const adjust = (w: number, delta: number) =>
    setCounts((prev) => ({ ...prev, [w]: Math.max(0, (prev[w] ?? 0) + delta) }))

  const quickAdjust = (delta: number) => {
    const current = parseFloat(val) || 0
    setVal(num(Math.max(0, current + delta)))
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const platesPerSide = PLATE_WEIGHTS.reduce((sum, w) => sum + w * (counts[w] ?? 0), 0)
  const calcWeight = BAR_WEIGHT + platesPerSide * 2
  const hasPlates = platesPerSide > 0

  const save = async () => {
    const w = mode === 'plates' ? calcWeight : parseFloat(val)
    if (!isFinite(w) || w <= 0) return
    await logWeight(item.name, dayId, w)
    onClose()
  }

  return (
    <Sheet title={item.name} onClose={onClose}>
      <div className="mode-toggle">
        <button type="button" className={`mode-btn${mode === 'weight' ? ' active' : ''}`} onClick={() => setMode('weight')}>
          Weight
        </button>
        <button type="button" className={`mode-btn${mode === 'plates' ? ' active' : ''}`} onClick={() => setMode('plates')}>
          Plates
        </button>
      </div>

      {mode === 'weight' ? (
        <>
          <input
            ref={inputRef}
            className="field"
            type="number"
            inputMode="decimal"
            autoFocus
            placeholder={`Weight (${unit})`}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <div className="weight-adjusters">
            {ADJUSTMENTS.map((d) => (
              <button
                key={d}
                type="button"
                className="adj-btn"
                onPointerDown={(e) => { e.preventDefault(); quickAdjust(d) }}
              >
                {d > 0 ? '+' : ''}{d}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="plate-calc">
            {PLATE_WEIGHTS.map((w) => {
              const count = counts[w] ?? 0
              return (
                <div key={w} className="plate-row">
                  <span className="plate-label">{w}</span>
                  <div className="plate-stepper">
                    <button type="button" className="stepper-btn" onClick={() => adjust(w, -1)}>−</button>
                    <span className="stepper-count">{count}</span>
                    <button type="button" className="stepper-btn" onClick={() => adjust(w, 1)}>+</button>
                  </div>
                  <span className={`plate-side-total${count > 0 ? ' has-weight' : ''}`}>
                    {count > 0 ? num(w * count) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="plate-total">
            {num(calcWeight)} {unit}
            <span className="plate-breakdown">
              {hasPlates ? `${BAR_WEIGHT} bar + ${num(platesPerSide)} × 2/side` : 'bar only'}
            </span>
          </div>
        </>
      )}

      <div className="row">
        {existing && (
          <button type="button" className="btn btn-outline" onClick={async () => { await deleteTodayLog(item.name, dayId); onClose() }}>
            Clear
          </button>
        )}
        <button type="button" className="btn btn-accent" onClick={save}>
          {existing ? 'Update' : 'Save'}
          {mode === 'plates' && hasPlates ? ` · ${num(calcWeight)} ${unit}` : ''}
        </button>
      </div>

      {item.customId != null && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button type="button" className="del-link" onClick={async () => { await removeCustomExercise(item.customId!); onClose() }}>
            Remove exercise
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
    <Sheet title="Add exercise" onClose={onClose}>
      <input
        className="field"
        autoFocus
        placeholder="Exercise name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button className="btn btn-accent btn-full" onClick={save}>Add</button>
    </Sheet>
  )
}
