import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayISO } from '../db/db'
import type { Split } from '../config/splits'

interface Props {
  split: Split
  dayRolloverHour: number
  onOpenDay: (dayId: string) => void
  onOpenSettings: () => void
}

function weekMonday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function prevMonday(mondayStr: string): string {
  const [y, m, d] = mondayStr.split('-').map(Number)
  const date = new Date(y, m - 1, d - 7)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function useWeekStreak(dayRolloverHour: number): number {
  const logs = useLiveQuery(() => db.logs.toArray(), []) ?? []
  const weekSet = new Set(logs.map((l) => weekMonday(l.date)))
  const today = todayISO(dayRolloverHour)
  const curWeek = weekMonday(today)
  const lastWeek = prevMonday(curWeek)
  const start = weekSet.has(curWeek) ? curWeek : weekSet.has(lastWeek) ? lastWeek : null
  if (!start) return 0
  let streak = 0
  let check = start
  while (weekSet.has(check)) { streak++; check = prevMonday(check) }
  return streak
}

export function DaySelect({ split, dayRolloverHour, onOpenDay, onOpenSettings }: Props) {
  const streak = useWeekStreak(dayRolloverHour)

  const sortedDays = [...split.days].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Workout</h1>
        <button className="btn-icon" onClick={onOpenSettings} aria-label="Settings">⚙︎</button>
      </div>

      <button className="btn-ghost" onClick={onOpenSettings} style={{ padding: '0 0 16px' }}>
        {split.name} split ›
      </button>

      {streak > 0 && (
        <div className="streak-badge">
          🔥 {streak} {streak === 1 ? 'week' : 'weeks'} streak
        </div>
      )}

      {sortedDays.map((d) => (
        <button key={d.id} className="day-card" onClick={() => onOpenDay(d.id)}>
          <span>
            <div className="day-card-name">{d.name}</div>
            <div className="day-card-sub">{d.exercises.length} exercises</div>
          </span>
          <span className="chev">›</span>
        </button>
      ))}
    </div>
  )
}
