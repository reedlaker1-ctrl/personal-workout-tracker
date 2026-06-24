interface Point {
  date: string
  value: number
}

interface Props {
  points: Point[] // assumed sorted ascending by date
  height?: number
  sparkline?: boolean
}

/** Lightweight hand-rolled SVG line chart — no chart dependency. */
export function LineChart({ points, height = 160, sparkline = false }: Props) {
  const W = 320
  const H = height
  const padX = sparkline ? 2 : 8
  const padY = sparkline ? 4 : 14

  if (points.length === 0) {
    return <div className="subtle" style={{ padding: 12 }}>No data yet.</div>
  }

  const values = points.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    // Flat line — give it some vertical room.
    min -= 1
    max += 1
  }

  const n = points.length
  const x = (i: number) =>
    padX + (n === 1 ? (W - padX * 2) / 2 : (i / (n - 1)) * (W - padX * 2))
  const y = (v: number) => padY + (1 - (v - min) / (max - min)) * (H - padY * 2)

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ')
  const areaPath =
    `${linePath} L${x(n - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#lc-fill)" stroke="none" />
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
          <circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill="#4f8cff" />
        ))}
    </svg>
  )
}
