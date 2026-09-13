import { useState } from 'react'
import { setSetting, deleteSplit } from '../db/db'
import type { Split } from '../config/splits'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { SplitSetup } from './SplitSetup'

interface Props {
  splits: Split[]
  currentSplitId: string | null
  onDone: () => void
}

export function SplitManager({ splits, currentSplitId, onDone }: Props) {
  const [editing, setEditing] = useState<Split | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Split | null>(null)

  const switchTo = (id: string) => {
    if (id !== currentSplitId) setSetting('currentSplitId', id)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    await deleteSplit(deleting.id)
    if (deleting.id === currentSplitId) {
      const next = splits.find((s) => s.id !== deleting.id)
      if (next) await setSetting('currentSplitId', next.id)
    }
  }

  if (editing) {
    return (
      <SplitSetup
        initialSplit={editing === 'new' ? undefined : editing}
        allSplits={splits}
        onSaved={editing === 'new' ? (s) => setSetting('currentSplitId', s.id) : undefined}
        onDone={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-back" onClick={onDone} aria-label="Back">‹</button>
        <h1 className="screen-title">Splits</h1>
      </div>

      <p className="setup-intro">
        Tap a split to make it the one shown in the Workout tab. Keep a bulking and cutting split
        side by side and switch between them anytime.
      </p>

      {splits.map((s) => {
        const isActive = s.id === currentSplitId
        return (
          <div key={s.id} className={`day-card${isActive ? ' selected' : ''}`} style={{ gap: 10 }}>
            <button
              type="button"
              className="split-row-main"
              onClick={() => switchTo(s.id)}
            >
              <div className="day-card-name">
                {s.name}
                {isActive && <span className="split-active-badge">Active</span>}
              </div>
              <div className="day-card-sub">{s.days.length} {s.days.length === 1 ? 'day' : 'days'}</div>
            </button>
            <button
              type="button"
              className="btn-icon"
              aria-label={`Edit ${s.name}`}
              onClick={() => setEditing(s)}
            >
              ✎
            </button>
            {splits.length > 1 && (
              <button
                type="button"
                className="btn-icon"
                style={{ color: 'var(--danger)' }}
                aria-label={`Delete ${s.name}`}
                onClick={() => setDeleting(s)}
              >
                🗑
              </button>
            )}
          </div>
        )
      })}

      <button type="button" className="btn btn-ghost btn-full" onClick={() => setEditing('new')}>
        + New split
      </button>

      {deleting && (
        <ConfirmSheet
          title="Delete split?"
          message={`"${deleting.name}" and its day/exercise config will be removed. Logged history for its exercises is kept.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
