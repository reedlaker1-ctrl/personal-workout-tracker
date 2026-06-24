import { getSplit } from '../config/splits'

interface Props {
  splitId: string
  onOpenDay: (dayId: string) => void
  onOpenSettings: () => void
}

export function DaySelect({ splitId, onOpenDay, onOpenSettings }: Props) {
  const split = getSplit(splitId)

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Workout</h1>
        <button className="btn-icon" onClick={onOpenSettings} aria-label="Settings">
          ⚙︎
        </button>
      </div>

      <button className="btn-ghost" onClick={onOpenSettings} style={{ padding: '0 0 14px' }}>
        {split ? split.name : 'No'} split ›
      </button>

      {!split && <div className="empty">No split configured.</div>}

      {split?.days.map((d) => (
        <button key={d.id} className="day-card" onClick={() => onOpenDay(d.id)}>
          <span>{d.name}</span>
          <span className="chev">›</span>
        </button>
      ))}
    </div>
  )
}
