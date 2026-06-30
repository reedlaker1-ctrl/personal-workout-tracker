import { useState } from 'react'
import { setSetting, renameExerciseKey } from '../db/db'
import type { Split, SplitDay } from '../config/splits'

type ExDraft = { localId: string; originalName: string; name: string }

interface DayDraft {
  id: string
  name: string
  exercises: ExDraft[]
}

interface Props {
  initialSplit?: Split
  onDone: () => void
}

function genId() {
  return `d-${Math.random().toString(36).slice(2, 8)}`
}

export function SplitSetup({ initialSplit, onDone }: Props) {
  const isNew = !initialSplit
  const [splitName, setSplitName] = useState(initialSplit?.name ?? '')
  const [days, setDays] = useState<DayDraft[]>(
    initialSplit?.days.map((d) => ({
      id: d.id,
      name: d.name,
      exercises: d.exercises.map((ex) => ({ localId: ex, originalName: ex, name: ex })),
    })) ?? []
  )
  const [newEx, setNewEx] = useState<Record<string, string>>({})

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

  const addExercise = (dayId: string) => {
    const name = (newEx[dayId] ?? '').trim()
    if (!name) return
    const localId = `new-${Math.random().toString(36).slice(2, 8)}`
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, exercises: [...d.exercises, { localId, originalName: '', name }] }
          : d
      )
    )
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
    const split: Split = { id: 'user', name: splitName.trim(), days: validDays }
    await setSetting('userSplit', JSON.stringify(split))
    onDone()
  }

  return (
    <div className="screen">
      <div className="screen-header">
        {!isNew && (
          <button className="icon-back" onClick={onDone} aria-label="Back">‹</button>
        )}
        <h1 className="screen-title">{isNew ? 'Create your split' : 'Edit split'}</h1>
      </div>

      {isNew && (
        <p className="setup-intro">Name your training split and add your days.</p>
      )}

      <input
        className="field"
        placeholder="Split name (e.g. Arnold)"
        value={splitName}
        onChange={(e) => setSplitName(e.target.value)}
      />

      {days.map((day, di) => (
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
        </div>
      ))}

      <button type="button" className="btn btn-ghost btn-full" style={{ marginBottom: 12 }} onClick={addDay}>
        + Add day
      </button>

      <button type="button" className="btn btn-accent btn-full" onClick={save} style={{ opacity: canSave ? 1 : 0.4 }}>
        {isNew ? 'Start tracking' : 'Save changes'}
      </button>

      {!isNew && (
        <p className="setup-note">
          Renaming an exercise updates all of its log history to the new name.
        </p>
      )}
    </div>
  )
}
