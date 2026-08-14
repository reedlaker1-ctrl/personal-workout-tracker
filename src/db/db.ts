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

export type EntryMode = 'weight' | 'plates'

export interface WorkoutLog {
  id?: number
  exerciseKey: string // the exercise name — the stable key for "prior weight"
  dayId: string
  weight: number // the logged number — a rep count when the exercise's kind is 'reps'
  date: string // ISO date string (YYYY-MM-DD)
  // How this entry was entered. Remembered so the log sheet reopens to
  // whichever notation was used last time, plate breakdown included.
  mode?: EntryMode
  plateCounts?: Record<number, number>
}

export type MetricKind = 'weight' | 'reps'

export interface ExerciseKind {
  exerciseKey: string
  kind: MetricKind
}

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
  exerciseKinds!: Table<ExerciseKind, string>

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
    this.version(3).stores({
      settings: 'key',
      customExercises: '++id, dayId',
      logs: '++id, exerciseKey, dayId, date',
      metrics: '++id',
      metricEntries: '++id, metricId, date',
      photos: '++id, date',
      exerciseNudges: 'exerciseKey',
      exerciseKinds: 'exerciseKey',
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

/** Record (or overwrite) today's weight for an exercise. `mode`/`plateCounts`
 *  are remembered so the log sheet reopens to the same notation next time. */
export async function logWeight(
  exerciseKey: string,
  dayId: string,
  weight: number,
  mode?: EntryMode,
  plateCounts?: Record<number, number>,
): Promise<void> {
  const existing = await getTodayLog(exerciseKey)
  if (existing?.id != null) {
    await db.logs.update(existing.id, { weight, mode, plateCounts })
  } else {
    await db.logs.add({
      exerciseKey,
      dayId,
      weight,
      mode,
      plateCounts,
      date: todayISO(await getDayRolloverHour()),
    })
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
  await db.transaction('rw', db.logs, db.customExercises, db.exerciseKinds, async () => {
    await db.logs.where('exerciseKey').equals(oldKey).modify({ exerciseKey: newKey })
    const customs = await db.customExercises.toArray()
    for (const c of customs.filter((c) => c.name === oldKey)) {
      await db.customExercises.update(c.id!, { name: newKey })
    }
    const kind = await db.exerciseKinds.get(oldKey)
    if (kind) {
      await db.exerciseKinds.delete(oldKey)
      await db.exerciseKinds.put({ ...kind, exerciseKey: newKey })
    }
  })
}

/** Whether an exercise records a weight or a plain rep count. Defaults to
 *  'weight' for any exercise that hasn't been explicitly set otherwise. */
export async function getExerciseKind(exerciseKey: string): Promise<MetricKind> {
  const row = await db.exerciseKinds.get(exerciseKey)
  return row?.kind ?? 'weight'
}

export async function setExerciseKind(exerciseKey: string, kind: MetricKind): Promise<void> {
  await db.exerciseKinds.put({ exerciseKey, kind })
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

/** Logs, metrics, and split — no photos. Meant for pasting into an AI chat
 *  for analysis, so it stays small and readable rather than carrying along
 *  base64 photo data. */
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

// ── Backup / restore ──
// The backup format's shape, bumped whenever a field is added or removed so
// restoreData() can tell old backups apart from new ones if that's ever needed.
const BACKUP_FORMAT_VERSION = 1

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

interface BackupPayload {
  formatVersion?: number
  exportDate: string
  split: unknown
  workoutLogs: WorkoutLog[]
  metrics: Metric[]
  metricEntries: MetricEntry[]
  customExercises: CustomExercise[]
  photos: { date: string; caption?: string; dataUrl: string }[]
}

/** Everything needed to fully restore the app on a new device: logs,
 *  metrics, custom exercises, the split, and progress photos (inlined as
 *  data URLs so the whole backup is a single portable JSON file). Distinct
 *  from exportData(), which stays lean for pasting into an AI chat. */
export async function exportBackup(): Promise<string> {
  const [logs, metrics, metricEntries, customExercises, photos, settings] = await Promise.all([
    db.logs.toArray(),
    db.metrics.toArray(),
    db.metricEntries.toArray(),
    db.customExercises.toArray(),
    db.photos.toArray(),
    db.settings.toArray(),
  ])

  const userSplitJson = settings.find((s) => s.key === 'userSplit')?.value
  const split = userSplitJson ? JSON.parse(userSplitJson) : null

  const payload: BackupPayload = {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportDate: todayISO(await getDayRolloverHour()),
    split,
    workoutLogs: [...logs].sort((a, b) => (a.date < b.date ? -1 : 1)),
    metrics,
    metricEntries: [...metricEntries].sort((a, b) => (a.date < b.date ? -1 : 1)),
    customExercises,
    photos: await Promise.all(
      photos.map(async (p) => ({ date: p.date, caption: p.caption, dataUrl: await blobToDataURL(p.blob) })),
    ),
  }

  return JSON.stringify(payload)
}

/** Replaces all current logs, metrics, custom exercises, the split, and
 *  photos with what's in a previously exported backup file. */
export async function restoreData(json: string): Promise<void> {
  const payload = JSON.parse(json) as Partial<BackupPayload>

  // Decode photo data URLs to Blobs *before* opening the transaction — fetch()
  // isn't a Dexie-tracked operation, and awaiting one inside a transaction
  // callback makes IndexedDB commit the transaction prematurely.
  const photoBlobs = payload.photos?.length
    ? await Promise.all(
        payload.photos.map(async (p) => ({
          date: p.date,
          caption: p.caption,
          blob: await (await fetch(p.dataUrl)).blob(),
        })),
      )
    : []

  await db.transaction(
    'rw',
    [db.logs, db.metrics, db.metricEntries, db.customExercises, db.photos, db.settings],
    async () => {
      await Promise.all([
        db.logs.clear(),
        db.metrics.clear(),
        db.metricEntries.clear(),
        db.customExercises.clear(),
        db.photos.clear(),
      ])

      if (payload.split) {
        await db.settings.put({ key: 'userSplit', value: JSON.stringify(payload.split) })
      }

      if (payload.workoutLogs?.length) {
        await db.logs.bulkAdd(payload.workoutLogs.map(({ id: _id, ...rest }) => rest))
      }

      if (payload.customExercises?.length) {
        await db.customExercises.bulkAdd(payload.customExercises.map(({ id: _id, ...rest }) => rest))
      }

      if (payload.metrics?.length) {
        const idMap = new Map<number, number>()
        for (const m of payload.metrics) {
          const { id: oldId, ...rest } = m
          const newId = await db.metrics.add(rest)
          if (oldId != null) idMap.set(oldId, newId as number)
        }
        const remappedEntries = (payload.metricEntries ?? [])
          .map(({ id: _id, metricId, ...rest }) => ({ ...rest, metricId: idMap.get(metricId) }))
          .filter((e): e is MetricEntry => e.metricId != null)
        if (remappedEntries.length) await db.metricEntries.bulkAdd(remappedEntries)
      }

      if (photoBlobs.length) await db.photos.bulkAdd(photoBlobs)
    },
  )
}
