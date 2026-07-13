interface Props {
  tab: 'workout' | 'progress'
  onChange: (tab: 'workout' | 'progress') => void
}

function WorkoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6M20 9v6M7 7v10M17 7v10M7 12h10" />
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16l6-6 4 4 6-8" />
      <path d="M16 6h4v4" />
    </svg>
  )
}

export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className="tabbar">
      <button
        className={`tab${tab === 'workout' ? ' active' : ''}`}
        onClick={() => onChange('workout')}
      >
        <span className="tab-icon"><WorkoutIcon /></span>
        Workout
      </button>
      <button
        className={`tab${tab === 'progress' ? ' active' : ''}`}
        onClick={() => onChange('progress')}
      >
        <span className="tab-icon"><ProgressIcon /></span>
        Progress
      </button>
    </nav>
  )
}
