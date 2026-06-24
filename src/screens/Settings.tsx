import { splits } from '../config/splits'
import { setSetting, type Unit } from '../db/db'
import { Sheet } from '../components/Sheet'

interface Props {
  splitId: string
  unit: Unit
  onClose: () => void
}

export function Settings({ splitId, unit, onClose }: Props) {
  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="subtle" style={{ marginBottom: 8 }}>Split</div>
      <div style={{ marginBottom: 20 }}>
        {splits.map((s) => (
          <button
            key={s.id}
            className={`day-card${s.id === splitId ? ' done' : ''}`}
            style={{ padding: '16px 18px', fontSize: 17, marginBottom: 8 }}
            onClick={() => setSetting('currentSplitId', s.id)}
          >
            <span>{s.name}</span>
            <span className="chev">{s.id === splitId ? '✓' : ''}</span>
          </button>
        ))}
      </div>

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
