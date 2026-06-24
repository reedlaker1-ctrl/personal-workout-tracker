// ─────────────────────────────────────────────────────────────────────────────
// EDIT ME: This file defines your splits, days, and the default exercises shown
// on each day. Editing this file (or adding new splits) will NOT erase any
// progress you've logged — your logged weights live separately in the browser.
//
// Caveat: progress is keyed by the exercise *name*. If you RENAME an exercise
// here, its old logs won't follow the new name (they'll still exist under the
// old name). Adding or reordering exercises is always safe.
// ─────────────────────────────────────────────────────────────────────────────

export interface SplitDay {
  id: string
  name: string
  exercises: string[]
}

export interface Split {
  id: string
  name: string
  days: SplitDay[]
}

export const splits: Split[] = [
  {
    id: 'reed',
    name: 'Arnold',
    days: [
      {
        id: 'chest-back',
        name: 'Chest & Back',
        exercises: [
          'Barbell Bench Press',
          'Incline Bench Press',
          'Barbell Row',
          'Lat Pulldown',
          'Chest-Supported Row',
          'Pull-Up',
          'Pec Deck',
        ],
      },
      {
        id: 'shoulders-arms',
        name: 'Shoulders & Arms',
        exercises: [
          'Overhead Press',
          'Lateral Raise',
          'Cable Face Pull',
          'Bicep Curl',
          'Hammer Curl',
          'Tricep Extension',
          'Overhead Tricep Extension',
        ],
      },
      {
        id: 'legs',
        name: 'Legs',
        exercises: [
          'Barbell Squat',
          'Leg Press',
          'Romanian Deadlift',
          'Leg Extension',
          'Hamstring Curl',
          'Calf Raise',
        ],
      },
    ],
  },
]

export const DEFAULT_SPLIT_ID = splits[0].id

export function getSplit(id: string): Split | undefined {
  return splits.find((s) => s.id === id)
}
