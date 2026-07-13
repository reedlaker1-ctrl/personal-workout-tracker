import { useMemo, useRef, useState } from 'react'
import { num, shortDate } from '../util/format'

interface Point {
  date: string
  value: number
}

interface Props {
  points: Point[]
  height?: number
  sparkline?: boolean
  unit?: string
}

export function LineChart({ points, height = 160, sparkline = false, unit = '' }: Props) {
  const uid = useMemo(() => `lc-${Math.random().toString(36).slice(2, 8)}`, [])
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const draggingRef = useRef(false)

  const W = 320
  const H = height
  const padX = sparkline ? 2 : 8
  const padY = sparkline ? 4 : 14

  if (points.length === 0) {
    return <div className="subtle" style={{ padding: 12, textAlign: 'center' }}>No data yet.</div>
  }

  const values = points.map((p) => p.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  let min = rawMin
  let max = rawMax
  if (min === max) { min -= 1; max += 1 }

  const n = points.length
  const x = (i: number) =>
    padX + (n === 1 ? (W - padX * 2) / 2 : (i / (n - 1)) * (W - padX * 2))
  const y = (v: number) => padY + (1 - (v - min) / (max - min)) * (H - padY * 2)

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`

  const indexFromClientX = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * W
    let closest = 0
    let closestDist = Infinity
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - relX)
      if (d < closestDist) { closestDist = d; closest = i }
    }
    return closest
  }

  const startDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (sparkline) return
    draggingRef.current = true
    setHoverIdx(indexFromClientX(e.clientX))
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const moveDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return
    setHoverIdx(indexFromClientX(e.clientX))
  }
  const endDrag = () => {
    draggingRef.current = false
    setHoverIdx(null)
  }

  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null
  const tooltipLeftPct = hoverIdx !== null
    ? Math.min(88, Math.max(12, (x(hoverIdx) / W) * 100))
    : 0

  const chart = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ display: 'block', touchAction: sparkline ? undefined : 'none' }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${uid})`} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={sparkline ? 2 : 2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {!sparkline &&
        points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} fill="var(--accent)" />
        ))}
      {!sparkline && hoverPoint && hoverIdx !== null && (
        <g>
          <line
            x1={x(hoverIdx)} x2={x(hoverIdx)}
            y1={padY} y2={H - padY}
            stroke="var(--border-light)" strokeWidth={1}
          />
          <circle
            cx={x(hoverIdx)} cy={y(hoverPoint.value)} r={5.5}
            fill="var(--accent)" stroke="var(--surface)" strokeWidth={2}
          />
        </g>
      )}
    </svg>
  )

  if (sparkline) return chart

  return (
    <>
      <div className="chart-interactive">
        {chart}
        {hoverPoint && (
          <div className="chart-tooltip" style={{ left: `${tooltipLeftPct}%` }}>
            <div className="chart-tooltip-val">{num(hoverPoint.value)} {unit}</div>
            <div className="chart-tooltip-date">{shortDate(hoverPoint.date)}</div>
          </div>
        )}
      </div>
      <div className="chart-range">
        <span>Min {num(rawMin)} {unit}</span>
        <span>Max {num(rawMax)} {unit}</span>
      </div>
    </>
  )
}
