import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Unit } from './db/db'
import { DEFAULT_SPLIT_ID } from './config/splits'
import { TabBar } from './components/TabBar'
import { DaySelect } from './screens/DaySelect'
import { Checklist } from './screens/Checklist'
import { Progress } from './screens/Progress'
import { MetricDetail } from './screens/MetricDetail'
import { ExerciseDetail } from './screens/ExerciseDetail'
import { Settings } from './screens/Settings'

export default function App() {
  const [tab, setTab] = useState<'workout' | 'progress'>('workout')
  const [dayId, setDayId] = useState<string | null>(null)
  const [metricId, setMetricId] = useState<number | null>(null)
  const [exerciseKey, setExerciseKey] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const settings = useLiveQuery(() => db.settings.toArray(), [])
  const splitId =
    settings?.find((s) => s.key === 'currentSplitId')?.value ?? DEFAULT_SPLIT_ID
  const unit = (settings?.find((s) => s.key === 'unit')?.value ?? 'lb') as Unit

  return (
    <div className="app">
      {tab === 'workout' &&
        (dayId ? (
          <Checklist
            splitId={splitId}
            dayId={dayId}
            unit={unit}
            onBack={() => setDayId(null)}
          />
        ) : (
          <DaySelect
            splitId={splitId}
            onOpenDay={setDayId}
            onOpenSettings={() => setShowSettings(true)}
          />
        ))}

      {tab === 'progress' &&
        (exerciseKey != null ? (
          <ExerciseDetail
            exerciseKey={exerciseKey}
            unit={unit}
            onBack={() => setExerciseKey(null)}
          />
        ) : metricId != null ? (
          <MetricDetail
            metricId={metricId}
            unit={unit}
            onBack={() => setMetricId(null)}
          />
        ) : (
          <Progress
            unit={unit}
            splitId={splitId}
            onOpenMetric={setMetricId}
            onOpenExercise={setExerciseKey}
          />
        ))}

      <TabBar
        tab={tab}
        onChange={(t) => {
          setTab(t)
          if (t === 'workout') { setMetricId(null); setExerciseKey(null) }
          if (t === 'progress') setDayId(null)
        }}
      />

      {showSettings && (
        <Settings
          splitId={splitId}
          unit={unit}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
