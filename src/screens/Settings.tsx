import { useState } from 'react'
import { setSetting, exportData, todayISO, type Unit } from '../db/db'
import type { Split } from '../config/splits'
import { Sheet } from '../components/Sheet'

interface Props {
  split: Split | null
  unit: Unit
  onClose: () => void
  onEditSplit: () => void
}

export function Settings({ split, unit, onClose, onEditSplit }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const json = await exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workout-${todayISO()}.json`
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
    </Sheet>
  )
}
