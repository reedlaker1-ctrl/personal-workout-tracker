import { useMemo } from 'react'

interface Point {
  date: string
  value: number
}

interface Props {
  points: Point[]
  height?: number
  sparkline?: boolean
}

export function LineChart({ points, height = 160, sparkline = false }: Props) {
  const uid = useMemo(() => `lc-${Math.random().toString(36).slice(2, 8)}`, [])
  const W = 320
  const H = height
  const padX = sparkline ? 2 : 8
  const padY = sparkline ? 4 : 14

  if (points.length === 0) {
    return <div className="subtle" style={{ padding: 12, textAlign: 'center' }}>No data yet.</div>
  }

  const values = points.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) { min -= 1; max += 1 }

  const n = points.length
  const x = (i: number) =>
    padX + (n === 1 ? (W - padX * 2) / 2 : (i / (n - 1)) * (W - padX * 2))
  const y = (v: number) => padY + (1 - (v - min) / (max - min)) * (H - padY * 2)

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${uid})`} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="#4f8cff"
        strokeWidth={sparkline ? 2 : 2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {!sparkline &&
        points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} fill="#4f8cff" />
        ))}
    </svg>
  )
}
