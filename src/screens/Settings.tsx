import { setSetting, type Unit } from '../db/db'
import type { Split } from '../config/splits'
import { Sheet } from '../components/Sheet'

interface Props {
  split: Split | null
  unit: Unit
  onClose: () => void
  onEditSplit: () => void
}

export function Settings({ split, unit, onClose, onEditSplit }: Props) {
  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="subtle" style={{ marginBottom: 8 }}>Split</div>
      <button
        className="day-card"
        style={{ marginBottom: 24 }}
        onClick={() => { onClose(); onEditSplit() }}
      >
        <span>
          <div className="day-card-name">{split?.name ?? 'No split'}</div>
          <div className="day-card-sub">{split ? `${split.days.length} days` : 'Tap to create'}</div>
        </span>
        <span className="chev" style={{ fontSize: 14, color: 'var(--accent)' }}>Edit</span>
      </button>

      <div className="subtle" style={{ marginBottom: 8 }}>Units</div>
      <div className="row">
        {(['lb', 'kg'] as Unit[]).map((u) => (
          <button
            key={u}
            className={`btn${u === unit ? ' btn-accent' : ''}`}
            onClick={() => setSetting('unit', u)}
          >
            {u}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
