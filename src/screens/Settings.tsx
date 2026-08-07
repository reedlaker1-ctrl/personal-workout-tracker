import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  setSetting,
  exportData,
  todayISO,
  getExerciseKeysWithLogs,
  flipExerciseSign,
  type Unit,
} from '../db/db'
import type { Split } from '../config/splits'
import { Sheet } from '../components/Sheet'
import { ConfirmSheet } from '../components/ConfirmSheet'

interface Props {
  split: Split | null
  unit: Unit
  dayRolloverHour: number
  nudgeSessions: number
  nudgeWeeks: number
  onClose: () => void
  onEditSplit: () => void
}

const ROLLOVER_HOURS = [0, 1, 2, 3, 4, 5]
const NUDGE_SESSION_OPTIONS = [2, 3, 4, 5]
const NUDGE_WEEK_OPTIONS = [1, 2, 3, 4]

function hourLabel(h: number): string {
  return h === 0 ? '12am' : `${h}am`
}

export function Settings({
  split,
  unit,
  dayRolloverHour,
  nudgeSessions,
  nudgeWeeks,
  onClose,
  onEditSplit,
}: Props) {
  const [exporting, setExporting] = useState(false)
  const [flipping, setFlipping] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const json = await exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workout-${todayISO(dayRolloverHour)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

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
      <div className="row" style={{ marginBottom: 24 }}>
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

      <div className="subtle" style={{ marginBottom: 8 }}>Day resets at</div>
      <div className="row" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
        {ROLLOVER_HOURS.map((h) => (
          <button
            key={h}
            className={`btn${h === dayRolloverHour ? ' btn-accent' : ''}`}
            onClick={() => setSetting('dayRolloverHour', String(h))}
          >
            {hourLabel(h)}
          </button>
        ))}
      </div>
      <div className="subtle" style={{ marginBottom: 24, fontSize: 12, lineHeight: 1.5 }}>
        A workout still going after midnight counts as the day before until this time.
      </div>

      <div className="subtle" style={{ marginBottom: 8 }}>Plateau highlight after</div>
      <div className="row" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
        {NUDGE_SESSION_OPTIONS.map((n) => (
          <button
            key={n}
            className={`btn${n === nudgeSessions ? ' btn-accent' : ''}`}
            onClick={() => setSetting('nudgeSessions', String(n))}
          >
            {n} sessions
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
        {NUDGE_WEEK_OPTIONS.map((w) => (
          <button
            key={w}
            className={`btn${w === nudgeWeeks ? ' btn-accent' : ''}`}
            onClick={() => setSetting('nudgeWeeks', String(w))}
          >
            {w} {w === 1 ? 'week' : 'weeks'}
          </button>
        ))}
      </div>
      <div className="subtle" style={{ marginBottom: 24, fontSize: 12, lineHeight: 1.5 }}>
        An exercise's last weight is highlighted once it's held steady for both this many
        sessions and this many weeks — whichever takes longer.
      </div>

      <div className="subtle" style={{ marginBottom: 8 }}>Exercises</div>
      <button
        className="btn btn-full"
        style={{ justifyContent: 'flex-start', gap: 10, marginBottom: 24 }}
        onClick={() => setFlipping(true)}
      >
        <span style={{ fontSize: 18 }}>±</span>
        Flip exercise sign
      </button>

      <div className="subtle" style={{ marginBottom: 8 }}>Data</div>
      <button
        className="btn btn-full"
        style={{ justifyContent: 'flex-start', gap: 10 }}
        onClick={handleExport}
        disabled={exporting}
      >
        <span style={{ fontSize: 18 }}>↓</span>
        {exporting ? 'Exporting…' : 'Export data as JSON'}
      </button>
      <div className="subtle" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
        Downloads all workout logs, metrics, and your split config. Drop the file into any AI chat to get analysis, insights, or programming suggestions.
      </div>

      {flipping && <FlipSignSheet onClose={() => setFlipping(false)} />}
    </Sheet>
  )
}

function FlipSignSheet({ onClose }: { onClose: () => void }) {
  const exerciseKeys = useLiveQuery(() => getExerciseKeysWithLogs(), []) ?? []
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <Sheet title="Flip exercise sign" onClose={onClose}>
      <div className="subtle" style={{ marginBottom: 16, lineHeight: 1.5 }}>
        Multiplies every logged weight for an exercise by -1 — useful for switching an
        assisted exercise (like assisted pull-ups) between positive and negative tracking
        without re-entering history.
      </div>

      {exerciseKeys.length === 0 && (
        <div className="empty">No logged exercises yet.</div>
      )}

      {exerciseKeys.map((key) => (
        <button
          key={key}
          className="day-card"
          style={{ padding: 14, marginBottom: 9 }}
          onClick={() => setConfirming(key)}
        >
          <span className="day-card-name" style={{ fontSize: 16 }}>{key}</span>
          <span className="chev">›</span>
        </button>
      ))}

      {confirming && (
        <ConfirmSheet
          title="Flip sign?"
          message={`Every logged weight for "${confirming}" will be multiplied by -1.`}
          confirmLabel="Flip"
          onConfirm={() => flipExerciseSign(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}
    </Sheet>
  )
}
