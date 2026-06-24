interface Props {
  tab: 'workout' | 'progress'
  onChange: (tab: 'workout' | 'progress') => void
}

export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className="tabbar">
      <button
        className={`tab${tab === 'workout' ? ' active' : ''}`}
        onClick={() => onChange('workout')}
      >
        <span className="tab-icon">🏋️</span>
        Workout
      </button>
      <button
        className={`tab${tab === 'progress' ? ' active' : ''}`}
        onClick={() => onChange('progress')}
      >
        <span className="tab-icon">📈</span>
        Progress
      </button>
    </nav>
  )
}
