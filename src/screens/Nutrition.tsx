import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addNutritionEntry, deleteNutritionEntry, todayISO, getDayRolloverHour } from '../db/db'
import { Sheet } from '../components/Sheet'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { LineChart } from '../components/LineChart'
import { num, shortDate } from '../util/format'

export function Nutrition() {
  const entries = useLiveQuery(() => db.nutritionEntries.toArray(), []) ?? []
  const [adding, setAdding] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1))
  const desc = [...sorted].reverse()
  const confirmingEntry = desc.find((e) => e.id === confirmingId)

  const caloriePoints = sorted.map((e) => ({ date: e.date, value: e.calories }))
  const proteinPoints = sorted.map((e) => ({ date: e.date, value: e.protein }))

  return (
    <>
      {entries.length === 0 && (
        <div className="empty">
          Log your average daily calories and protein for the week to track trends over time.
        </div>
      )}

      {entries.length > 0 && (
        <>
          <div className="subtle" style={{ marginBottom: 8 }}>Calories / day</div>
          <div className="chart-wrap">
            <LineChart points={caloriePoints} height={140} unit="kcal" />
          </div>

          <div className="subtle" style={{ marginBottom: 8 }}>Protein / day</div>
          <div className="chart-wrap">
            <LineChart points={proteinPoints} height={140} unit="g" />
          </div>
        </>
      )}

      <button className="btn btn-full fab-row" onClick={() => setAdding(true)}>
        + Log this week
      </button>

      {desc.length > 0 && (
        <div className="card" style={{ padding: '4px 16px', marginTop: 16 }}>
          {desc.map((e) => (
            <div key={e.id} className="entry-row">
              <span className="entry-val">{num(e.calories)} kcal · {num(e.protein)}g</span>
              <span className="entry-date">{shortDate(e.date)}</span>
              <button
                className="btn-icon"
                style={{ fontSize: 15 }}
                aria-label="Delete entry"
                onClick={() => setConfirmingId(e.id!)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && <AddNutritionSheet onClose={() => setAdding(false)} />}

      {confirmingEntry && (
        <ConfirmSheet
          title="Delete entry?"
          message={`${num(confirmingEntry.calories)} kcal / ${num(confirmingEntry.protein)}g protein on ${shortDate(confirmingEntry.date)} will be removed.`}
          onConfirm={() => deleteNutritionEntry(confirmingEntry.id!)}
          onClose={() => setConfirmingId(null)}
        />
      )}
    </>
  )
}

function AddNutritionSheet({ onClose }: { onClose: () => void }) {
  // Wrapped in { entry } so "no entry yet" (null) is distinguishable from
  // "still loading" (undefined) — both would otherwise just be undefined.
  const todayEntryResult = useLiveQuery(async () => {
    const today = todayISO(await getDayRolloverHour())
    const entry = await db.nutritionEntries.where('date').equals(today).first()
    return { entry: entry ?? null }
  }, [])

  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    if (prefilled || todayEntryResult === undefined) return
    if (todayEntryResult.entry) {
      setCalories(num(todayEntryResult.entry.calories))
      setProtein(num(todayEntryResult.entry.protein))
    }
    setPrefilled(true)
  }, [todayEntryResult, prefilled])

  const existing = todayEntryResult?.entry

  const save = async () => {
    const c = parseFloat(calories)
    const p = parseFloat(protein)
    if (!isFinite(c) || !isFinite(p)) return
    await addNutritionEntry(c, p)
    onClose()
  }

  return (
    <Sheet title="Log this week" onClose={onClose}>
      <div className="subtle" style={{ marginBottom: 16, lineHeight: 1.5 }}>
        Enter your average daily calories and protein over the past week.
      </div>
      <input
        className="field"
        type="number"
        inputMode="decimal"
        autoFocus
        placeholder="Calories / day"
        value={calories}
        onChange={(e) => setCalories(e.target.value)}
      />
      <input
        className="field"
        type="number"
        inputMode="decimal"
        placeholder="Protein / day (g)"
        value={protein}
        onChange={(e) => setProtein(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button className="btn btn-accent btn-full" onClick={save}>
        {existing ? 'Update' : 'Save'}
      </button>
    </Sheet>
  )
}
