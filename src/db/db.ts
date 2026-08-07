import Dexie, { type Table } from 'dexie'
import { DEFAULT_SPLIT_ID } from '../config/splits'

// ─── Record types stored in IndexedDB (persists across app updates) ──────────

export type Unit = 'lb' | 'kg'

export interface Setting {
  key: string
  value: string
}

export interface CustomExercise {
  id?: number
  dayId: string
  name: string
}

export interface WorkoutLog {
  id?: number
  exerciseKey: string // the exercise name — the stable key for "prior weight"
  dayId: string
  weight: number
  date: string // ISO date string (YYYY-MM-DD)
}

export type MetricKind = 'weight' | 'reps'

export interface Metric {
  id?: number
  name: string
  // Missing on metrics created before this field existed — treat as 'weight'.
  kind?: MetricKind
}

export interface MetricEntry {
  id?: number
  metricId: number
  value: number
  date: string // ISO date string
}

export interface ProgressPhoto {
  id?: number
  blob: Blob
  date: string // ISO date string
  caption?: string
}

// No longer used by the app (the "push heavier" highlight is now computed
// live from log history instead of persisted per-exercise state), but the
// table stays declared so any database already upgraded to version 2 still
// opens cleanly.
interface ExerciseNudge {
  exerciseKey: string
  active: boolean
  snoozeRemaining: number
}

// ─── Database ────────────────────────────────────────────────────────────────

class WorkoutDB extends Dexie {
  settings!: Table<Setting, string>
  customExercises!: Table<CustomExercise, number>
  logs!: Table<WorkoutLog, number>
  metrics!: Table<Metric, number>
  metricEntries!: Table<MetricEntry, number>
  photos!: Table<ProgressPhoto, number>
  exerciseNudges!: Table<ExerciseNudge, string>

  constructor() {
    super('workout-app')
    this.version(1).stores({
      settings: 'key',
      customExercises: '++id, dayId',
      logs: '++id, exerciseKey, dayId, date',
      metrics: '++id',
      metricEntries: '++id, metricId, date',
      photos: '++id, date',
    })
    this.version(2).stores({
      settings: 'key',
      customExercises: '++id, dayId',
      logs: '++id, exerciseKey, dayId, date',
      metrics: '++id',
      metricEntries: '++id, metricId, date',
      photos: '++id, date',
      exerciseNudges: 'exerciseKey',
    })
  }
}

export const db = new WorkoutDB()

// ─── Helpers ─────────────────────────────────────────────────────────────────

// The "day" rolls over at this local hour instead of midnight, so a workout
// started before midnight but still going after it doesn't get treated as a
// new day partway through. User-configurable via the "dayRolloverHour" setting.
export const DEFAULT_DAY_ROLLOVER_HOUR = 3

export function todayISO(rolloverHour: number = DEFAULT_DAY_ROLLOVER_HOUR): string {
  // Local date as YYYY-MM-DD (avoids UTC off-by-one near midnight), shifted
  // back by the rollover hour so times before it still count as "yesterday".
  const d = new Date()
  d.setHours(d.getHours() - rolloverHour)
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

// ── Settings ──
export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await db.settings.get(key)
  return row?.value ?? fallback
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

export async function getCurrentSplitId(): Promise<string> {
  return getSetting('currentSplitId', DEFAULT_SPLIT_ID)
}

export async function getUnit(): Promise<Unit> {
  return (await getSetting('unit', 'lb')) as Unit
}

export async function getDayRolloverHour(): Promise<number> {
  return Number(await getSetting('dayRolloverHour', String(DEFAULT_DAY_ROLLOVER_HOUR)))
}

// ── Logs ──

/** Most recent log for an exercise strictly before today (the "prior" weight). */
export async function getPriorLog(exerciseKey: string): Promise<WorkoutLog | undefined> {
  const today = todayISO(await getDayRolloverHour())
  const logs = await db.logs.where('exerciseKey').equals(exerciseKey).toArray()
  const prior = logs
    .filter((l) => l.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  return prior[0]
}

/** Today's log for an exercise, if one exists. */
export async function getTodayLog(exerciseKey: string): Promise<WorkoutLog | undefined> {
  const today = todayISO(await getDayRolloverHour())
  const logs = await db.logs
    .where('exerciseKey')
    .equals(exerciseKey)
    .and((l) => l.date === today)
    .toArray()
  // If multiple were logged today, keep the latest id.
  return logs.sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0]
}

/** Record (or overwrite) today's weight for an exercise. */
export async function logWeight(
  exerciseKey: string,
  dayId: string,
  weight: number,
): Promise<void> {
  const existing = await getTodayLog(exerciseKey)
  if (existing?.id != null) {
    await db.logs.update(existing.id, { weight })
  } else {
    await db.logs.add({ exerciseKey, dayId, weight, date: todayISO(await getDayRolloverHour()) })
  }
}

export async function deleteTodayLog(exerciseKey: string, dayId: string): Promise<void> {
  const today = todayISO(await getDayRolloverHour())
  const existing = await db.logs
    .where('exerciseKey')
    .equals(exerciseKey)
    .and((l) => l.dayId === dayId && l.date === today)
    .first()
  if (existing?.id != null) await db.logs.delete(existing.id)
}

/** Distinct exercise names that have at least one logged entry. */
export async function getExerciseKeysWithLogs(): Promise<string[]> {
  const logs = await db.logs.toArray()
  return [...new Set(logs.map((l) => l.exerciseKey))].sort((a, b) => a.localeCompare(b))
}

/** Multiplies every logged weight for an exercise by -1 — for retroactively
 *  switching an assisted exercise (e.g. assisted pull-ups) between positive
 *  and negative tracking without re-entering history. */
export async function flipExerciseSign(exerciseKey: string): Promise<void> {
  const logs = await db.logs.where('exerciseKey').equals(exerciseKey).toArray()
  await db.transaction('rw', db.logs, async () => {
    for (const log of logs) {
      if (log.id != null) await db.logs.update(log.id, { weight: -log.weight })
    }
  })
}

export async function renameExerciseKey(oldKey: string, newKey: string): Promise<void> {
  await db.transaction('rw', db.logs, db.customExercises, async () => {
    await db.logs.where('exerciseKey').equals(oldKey).modify({ exerciseKey: newKey })
    const customs = await db.customExercises.toArray()
    for (const c of customs.filter((c) => c.name === oldKey)) {
      await db.customExercises.update(c.id!, { name: newKey })
    }
  })
}

// ── "Push heavier" highlight ──
// A plateau only counts once the current same-weight streak is both long
// enough (a handful of sessions — not a one-off repeat) and old enough (a
// few weeks — so someone training an exercise 2x/week isn't flagged after
// a single week, while someone who trains it rarely still gets flagged
// once they've genuinely sat still for a while). Both thresholds are
// user-configurable in Settings.
export const DEFAULT_NUDGE_SESSIONS = 3
export const DEFAULT_NUDGE_WEEKS = 2

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

/** True once an exercise's most recent weight has held steady for both
 *  `minSessions` sessions and `minWeeks` weeks. Pure function over
 *  already-loaded logs — no highlight state is persisted anywhere. */
export function isWeightStagnant(
  logs: WorkoutLog[],
  minSessions: number,
  minWeeks: number,
): boolean {
  if (logs.length < minSessions) return false
  const byDate = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1))

  const latestWeight = byDate[byDate.length - 1].weight
  let streakStart = byDate.length - 1
  while (streakStart > 0 && byDate[streakStart - 1].weight === latestWeight) streakStart--
  const streak = byDate.slice(streakStart)

  if (streak.length < minSessions) return false
  return daysBetween(streak[0].date, streak[streak.length - 1].date) >= minWeeks * 7
}

// ── Custom exercises ──
export async function addCustomExercise(dayId: string, name: string): Promise<void> {
  await db.customExercises.add({ dayId, name: name.trim() })
}

export async function removeCustomExercise(id: number): Promise<void> {
  await db.customExercises.delete(id)
}

// ── Metrics ──
export async function addMetric(name: string, kind: MetricKind = 'weight'): Promise<number> {
  return (await db.metrics.add({ name: name.trim(), kind })) as number
}

export async function deleteMetric(id: number): Promise<void> {
  await db.transaction('rw', db.metrics, db.metricEntries, async () => {
    await db.metricEntries.where('metricId').equals(id).delete()
    await db.metrics.delete(id)
  })
}

export async function addMetricEntry(metricId: number, value: number): Promise<void> {
  await db.metricEntries.add({ metricId, value, date: todayISO(await getDayRolloverHour()) })
}

export async function deleteMetricEntry(id: number): Promise<void> {
  await db.metricEntries.delete(id)
}

// ── Photos ──
export async function addPhoto(blob: Blob, caption?: string): Promise<void> {
  await db.photos.add({ blob, date: todayISO(await getDayRolloverHour()), caption })
}

export async function deletePhoto(id: number): Promise<void> {
  await db.photos.delete(id)
}

// ── Export ──
export async function exportData(): Promise<string> {
  const [logs, metrics, metricEntries, settings] = await Promise.all([
    db.logs.toArray(),
    db.metrics.toArray(),
    db.metricEntries.toArray(),
    db.settings.toArray(),
  ])

  const userSplitJson = settings.find((s) => s.key === 'userSplit')?.value
  const split = userSplitJson ? JSON.parse(userSplitJson) : null

  const payload = {
    exportDate: todayISO(await getDayRolloverHour()),
    split,
    workoutLogs: [...logs].sort((a, b) => (a.date < b.date ? -1 : 1)),
    metrics,
    metricEntries: [...metricEntries].sort((a, b) => (a.date < b.date ? -1 : 1)),
  }

  return JSON.stringify(payload, null, 2)
}
