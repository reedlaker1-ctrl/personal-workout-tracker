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

export interface Metric {
  id?: number
  name: string
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

// ─── Database ────────────────────────────────────────────────────────────────

class WorkoutDB extends Dexie {
  settings!: Table<Setting, string>
  customExercises!: Table<CustomExercise, number>
  logs!: Table<WorkoutLog, number>
  metrics!: Table<Metric, number>
  metricEntries!: Table<MetricEntry, number>
  photos!: Table<ProgressPhoto, number>

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
  }
}

export const db = new WorkoutDB()

// ─── Helpers ─────────────────────────────────────────────────────────────────

// The "day" rolls over at this local hour instead of midnight, so a workout
// started before midnight but still going after it doesn't get treated as a
// new day partway through.
const DAY_ROLLOVER_HOUR = 3

export function todayISO(): string {
  // Local date as YYYY-MM-DD (avoids UTC off-by-one near midnight), shifted
  // back by the rollover hour so times before it still count as "yesterday".
  const d = new Date()
  d.setHours(d.getHours() - DAY_ROLLOVER_HOUR)
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

// ── Logs ──

/** Most recent log for an exercise strictly before today (the "prior" weight). */
export async function getPriorLog(exerciseKey: string): Promise<WorkoutLog | undefined> {
  const today = todayISO()
  const logs = await db.logs.where('exerciseKey').equals(exerciseKey).toArray()
  const prior = logs
    .filter((l) => l.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  return prior[0]
}

/** Today's log for an exercise, if one exists. */
export async function getTodayLog(exerciseKey: string): Promise<WorkoutLog | undefined> {
  const today = todayISO()
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
    await db.logs.add({ exerciseKey, dayId, weight, date: todayISO() })
  }
}

export async function deleteTodayLog(exerciseKey: string, dayId: string): Promise<void> {
  const today = todayISO()
  const existing = await db.logs
    .where('exerciseKey')
    .equals(exerciseKey)
    .and((l) => l.dayId === dayId && l.date === today)
    .first()
  if (existing?.id != null) await db.logs.delete(existing.id)
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

// ── Custom exercises ──
export async function addCustomExercise(dayId: string, name: string): Promise<void> {
  await db.customExercises.add({ dayId, name: name.trim() })
}

export async function removeCustomExercise(id: number): Promise<void> {
  await db.customExercises.delete(id)
}

// ── Metrics ──
export async function addMetric(name: string): Promise<number> {
  return (await db.metrics.add({ name: name.trim() })) as number
}

export async function deleteMetric(id: number): Promise<void> {
  await db.transaction('rw', db.metrics, db.metricEntries, async () => {
    await db.metricEntries.where('metricId').equals(id).delete()
    await db.metrics.delete(id)
  })
}

export async function addMetricEntry(metricId: number, value: number): Promise<void> {
  await db.metricEntries.add({ metricId, value, date: todayISO() })
}

export async function deleteMetricEntry(id: number): Promise<void> {
  await db.metricEntries.delete(id)
}

// ── Photos ──
export async function addPhoto(blob: Blob, caption?: string): Promise<void> {
  await db.photos.add({ blob, date: todayISO(), caption })
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
    exportDate: todayISO(),
    split,
    workoutLogs: [...logs].sort((a, b) => (a.date < b.date ? -1 : 1)),
    metrics,
    metricEntries: [...metricEntries].sort((a, b) => (a.date < b.date ? -1 : 1)),
  }

  return JSON.stringify(payload, null, 2)
}
