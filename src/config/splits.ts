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
    id: 'arnold',
    name: 'Arnold',
    days: [
      {
        id: 'legs',
        name: 'Legs',
        exercises: [
          'Squat',
          'Leg Press',
          'Romanian Deadlift',
          'Leg Extension',
          'Leg Curl',
          'Standing Calf Raise',
        ],
      },
      {
        id: 'arms-shoulders',
        name: 'Arms & Shoulders',
        exercises: [
          'Overhead Press',
          'Lateral Raise',
          'Rear Delt Fly',
          'Barbell Curl',
          'Incline Dumbbell Curl',
          'Tricep Pushdown',
          'Overhead Tricep Extension',
        ],
      },
      {
        id: 'chest-back',
        name: 'Chest & Back',
        exercises: [
          'Bench Press',
          'Incline Dumbbell Press',
          'Cable Fly',
          'Pull-Up',
          'Barbell Row',
          'Lat Pulldown',
          'Seated Cable Row',
        ],
      },
    ],
  },
]

export const DEFAULT_SPLIT_ID = splits[0].id

export function getSplit(id: string): Split | undefined {
  return splits.find((s) => s.id === id)
}
