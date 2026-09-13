import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, saveSplit, renameExerciseKey, getExerciseKeysWithLogs } from '../db/db'
import type { Split, SplitDay } from '../config/splits'

type ExDraft = { localId: string; originalName: string; name: string }

interface DayDraft {
  id: string
  name: string
  exercises: ExDraft[]
}

interface Props {
  initialSplit?: Split
  /** All saved splits, used to suggest exercises already used elsewhere
   *  (other days, other splits) instead of only ones typed here before. */
  allSplits?: Split[]
  /** Called with the saved split just before onDone(), e.g. to make a
   *  newly-created split the active one. */
  onSaved?: (split: Split) => void
  onDone: () => void
}

function genId() {
  return `d-${Math.random().toString(36).slice(2, 8)}`
}

function genSplitId() {
  return `split-${Math.random().toString(36).slice(2, 8)}`
}

export function SplitSetup({ initialSplit, allSplits = [], onSaved, onDone }: Props) {
  const isNew = !initialSplit
  const [splitId] = useState(initialSplit?.id ?? genSplitId())
  const [splitName, setSplitName] = useState(initialSplit?.name ?? '')
  const [days, setDays] = useState<DayDraft[]>(
    initialSplit?.days.map((d) => ({
      id: d.id,
      name: d.name,
      exercises: d.exercises.map((ex) => ({ localId: ex, originalName: ex, name: ex })),
    })) ?? []
  )
  const [newEx, setNewEx] = useState<Record<string, string>>({})

  const customExercisesRaw = useLiveQuery(() => db.customExercises.toArray(), [])
  const customExercises = customExercisesRaw ?? []
  const loggedExerciseKeys = useLiveQuery(() => getExerciseKeysWithLogs(), []) ?? []

  // Exercises added on-the-fly from the Workout tab ("+ Add exercise") live in
  // a separate table, keyed by day, rather than in the split's own exercise
  // list — so a day edited here wouldn't show them at all, and re-adding one
  // as a "suggestion" would create a second, duplicate row. Fold any of them
  // that belong to this split's days into the draft once, on load.
  const [customExercisesMerged, setCustomExercisesMerged] = useState(!initialSplit)
  useEffect(() => {
    if (customExercisesMerged || customExercisesRaw === undefined) return
    setDays((prev) =>
      prev.map((d) => {
        const existingNames = new Set(d.exercises.map((e) => e.name.trim().toLowerCase()))
        const toAdd = customExercisesRaw
          .filter((c) => c.dayId === d.id && !existingNames.has(c.name.trim().toLowerCase()))
          .map((c) => ({ localId: `custom-${c.id}`, originalName: c.name, name: c.name }))
        return toAdd.length ? { ...d, exercises: [...d.exercises, ...toAdd] } : d
      })
    )
    setCustomExercisesMerged(true)
  }, [customExercisesRaw, customExercisesMerged])

  // Every exercise name known anywhere — other days here, other splits, custom
  // exercises added from the Workout tab, or just logged historically — so
  // adding one to a day doesn't mean retyping it from scratch.
  const knownExerciseNames = useMemo(() => {
    const names = new Set<string>()
    for (const s of allSplits) {
      for (const d of s.days) {
        for (const ex of d.exercises) names.add(ex)
      }
    }
    for (const c of customExercises) names.add(c.name)
    for (const k of loggedExerciseKeys) names.add(k)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [allSplits, customExercises, loggedExerciseKeys])

  const addDay = () => {
    const id = genId()
    setDays((prev) => [...prev, { id, name: '', exercises: [] }])
  }

  const removeDay = (id: string) => setDays((prev) => prev.filter((d) => d.id !== id))

  const updateDayName = (id: string, name: string) =>
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)))

  const updateExerciseName = (dayId: string, localId: string, value: string) =>
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.map((e) => (e.localId === localId ? { ...e, name: value } : e)) }
          : d
      )
    )

  const addExerciseNamed = (dayId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d
        const alreadyThere = d.exercises.some((e) => e.name.trim().toLowerCase() === trimmed.toLowerCase())
        if (alreadyThere) return d
        const localId = `new-${Math.random().toString(36).slice(2, 8)}`
        return { ...d, exercises: [...d.exercises, { localId, originalName: '', name: trimmed }] }
      })
    )
  }

  const addExercise = (dayId: string) => {
    addExerciseNamed(dayId, newEx[dayId] ?? '')
    setNewEx((prev) => ({ ...prev, [dayId]: '' }))
  }

  const removeExercise = (dayId: string, localId: string) =>
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.localId !== localId) } : d
      )
    )

  const canSave =
    splitName.trim().length > 0 &&
    days.some((d) => d.name.trim() && d.exercises.some((e) => e.name.trim()))

  const save = async () => {
    if (!canSave) return

    // Migrate any renamed exercises before persisting the new split config
    const renames = days.flatMap((d) =>
      d.exercises
        .filter((e) => e.originalName !== '' && e.originalName !== e.name && e.name.trim())
        .map((e) => ({ from: e.originalName, to: e.name.trim() }))
    )
    for (const { from, to } of renames) {
      await renameExerciseKey(from, to)
    }

    const validDays: SplitDay[] = days
      .filter((d) => d.name.trim() && d.exercises.some((e) => e.name.trim()))
      .map((d) => ({
        id: d.id,
        name: d.name.trim(),
        exercises: d.exercises.filter((e) => e.name.trim()).map((e) => e.name.trim()),
      }))
    const split: Split = { id: splitId, name: splitName.trim(), days: validDays }
    await saveSplit(split)

    // Any custom exercise now folded into a day's saved list would otherwise
    // still sit in the customExercises table too, showing up twice on the
    // Workout tab (once from the split, once as a "custom" row).
    const redundantCustomIds = customExercises
      .filter((c) =>
        validDays.some(
          (d) => d.id === c.dayId && d.exercises.some((e) => e.toLowerCase() === c.name.trim().toLowerCase()),
        ),
      )
      .map((c) => c.id!)
    if (redundantCustomIds.length) {
      await db.customExercises.bulkDelete(redundantCustomIds)
    }

    onSaved?.(split)
    onDone()
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-back" onClick={onDone} aria-label="Back">‹</button>
        <h1 className="screen-title">{isNew ? 'New split' : 'Edit split'}</h1>
      </div>

      <p className="setup-intro">
        {isNew
          ? 'Name your training split and add your days.'
          : 'Rename days or exercises, or pick from anything you’ve already used elsewhere.'}
      </p>

      <input
        className="field"
        placeholder="Split name (e.g. Arnold)"
        value={splitName}
        onChange={(e) => setSplitName(e.target.value)}
      />

      {days.map((day, di) => {
        const dayNames = new Set(day.exercises.map((e) => e.name.trim().toLowerCase()))
        const suggestions = knownExerciseNames.filter((n) => !dayNames.has(n.toLowerCase()))

        return (
          <div key={day.id} className="setup-day">
            <div className="setup-day-header">
              <input
                className="field setup-day-name"
                placeholder={`Day ${di + 1} name (e.g. Chest & Back)`}
                value={day.name}
                onChange={(e) => updateDayName(day.id, e.target.value)}
              />
              <button
                type="button"
                className="btn-icon"
                style={{ color: 'var(--danger)', fontSize: 16 }}
                onClick={() => removeDay(day.id)}
              >
                ✕
              </button>
            </div>

            {day.exercises.length > 0 && (
              <div className="setup-ex-list">
                {day.exercises.map((ex) => (
                  <div key={ex.localId} className="setup-ex-row">
                    <input
                      className="setup-ex-input"
                      value={ex.name}
                      placeholder="Exercise name"
                      onChange={(e) => updateExerciseName(day.id, ex.localId, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ fontSize: 14, padding: '4px 0 4px 10px' }}
                      onClick={() => removeExercise(day.id, ex.localId)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="setup-add-row">
              <input
                className="field"
                style={{ marginBottom: 0, flex: 1 }}
                placeholder="Add exercise…"
                value={newEx[day.id] ?? ''}
                onChange={(e) => setNewEx((prev) => ({ ...prev, [day.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addExercise(day.id)}
              />
              <button
                type="button"
                className="btn"
                style={{ flex: 'none', padding: '14px 18px' }}
                onClick={() => addExercise(day.id)}
              >
                +
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="setup-suggestions">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="setup-chip"
                    onClick={() => addExerciseNamed(day.id, name)}
                  >
                    + {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <button type="button" className="btn btn-ghost btn-full" style={{ marginBottom: 12 }} onClick={addDay}>
        + Add day
      </button>

      <button type="button" className="btn btn-accent btn-full" onClick={save} style={{ opacity: canSave ? 1 : 0.4 }}>
        {isNew ? 'Create split' : 'Save changes'}
      </button>

      {!isNew && (
        <p className="setup-note">
          Renaming an exercise updates all of its log history to the new name.
        </p>
      )}
    </div>
  )
}
