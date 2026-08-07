import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  setSetting,
  DEFAULT_DAY_ROLLOVER_HOUR,
  DEFAULT_NUDGE_SESSIONS,
  DEFAULT_NUDGE_WEEKS,
  type Unit,
} from './db/db'
import { splits, type Split } from './config/splits'
import { TabBar } from './components/TabBar'
import { DaySelect } from './screens/DaySelect'
import { Checklist } from './screens/Checklist'
import { Progress } from './screens/Progress'
import { MetricDetail } from './screens/MetricDetail'
import { ExerciseDetail } from './screens/ExerciseDetail'
import { Settings } from './screens/Settings'
import { SplitSetup } from './screens/SplitSetup'

function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="spinner" />
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'workout' | 'progress'>('workout')
  const [dayId, setDayId] = useState<string | null>(null)
  const [metricId, setMetricId] = useState<number | null>(null)
  const [exerciseKey, setExerciseKey] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  const settings = useLiveQuery(() => db.settings.toArray(), [])
  const unit = (settings?.find((s) => s.key === 'unit')?.value ?? 'lb') as Unit
  const dayRolloverHour = Number(
    settings?.find((s) => s.key === 'dayRolloverHour')?.value ?? DEFAULT_DAY_ROLLOVER_HOUR,
  )
  const nudgeSessions = Number(
    settings?.find((s) => s.key === 'nudgeSessions')?.value ?? DEFAULT_NUDGE_SESSIONS,
  )
  const nudgeWeeks = Number(
    settings?.find((s) => s.key === 'nudgeWeeks')?.value ?? DEFAULT_NUDGE_WEEKS,
  )
  const nudgeEnabled = (settings?.find((s) => s.key === 'nudgeEnabled')?.value ?? 'true') === 'true'

  const userSplitJson = settings?.find((s) => s.key === 'userSplit')?.value
  const activeSplit: Split | null = userSplitJson ? (JSON.parse(userSplitJson) as Split) : null

  // Seed from the hardcoded split on first launch so the user isn't dropped into an empty app
  useEffect(() => {
    if (settings === undefined) return
    if (!settings.some((s) => s.key === 'userSplit')) {
      setSetting('userSplit', JSON.stringify(splits[0]))
    }
  }, [settings])

  if (settings === undefined) return <LoadingScreen />

  if (showSetup) {
    return (
      <div className="app">
        <SplitSetup initialSplit={activeSplit ?? undefined} onDone={() => setShowSetup(false)} />
      </div>
    )
  }

  // activeSplit should be defined after the seed effect fires, but guard just in case
  if (!activeSplit) return <LoadingScreen />

  return (
    <div className="app">
      {tab === 'workout' &&
        (dayId ? (
          <Checklist
            split={activeSplit}
            dayId={dayId}
            unit={unit}
            dayRolloverHour={dayRolloverHour}
            nudgeSessions={nudgeSessions}
            nudgeWeeks={nudgeWeeks}
            nudgeEnabled={nudgeEnabled}
            onBack={() => setDayId(null)}
          />
        ) : (
          <DaySelect
            split={activeSplit}
            dayRolloverHour={dayRolloverHour}
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
            split={activeSplit}
            nudgeSessions={nudgeSessions}
            nudgeWeeks={nudgeWeeks}
            nudgeEnabled={nudgeEnabled}
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
          split={activeSplit}
          unit={unit}
          dayRolloverHour={dayRolloverHour}
          nudgeSessions={nudgeSessions}
          nudgeWeeks={nudgeWeeks}
          nudgeEnabled={nudgeEnabled}
          onClose={() => setShowSettings(false)}
          onEditSplit={() => { setShowSettings(false); setShowSetup(true) }}
        />
      )}
    </div>
  )
}
