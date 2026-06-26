interface Series {
  data: number[]
  color: string
  label: string
}

interface Props {
  series: Series[]
  height?: number
  max?: number
}

export default function AreaChart({ series, height = 220, max = 100 }: Props) {
  const w = 600
  const pad = 10
  const chartH = height - pad * 2

  const buildPath = (data: number[]) => {
    if (data.length === 0) return ''
    return data
      .map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2)
        const y = pad + chartH - (Math.min(v, max) / max) * chartH
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
        {/* grid */}
        {[0, 25, 50, 75, 100].map((g) => {
          const y = pad + chartH - (g / 100) * chartH
          return (
            <g key={g}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#191b21" strokeWidth="1" strokeDasharray="3 3" />
              <text x={0} y={y + 3} className="fill-atlab-500" style={{ fontSize: 9 }}>{g}</text>
            </g>
          )
        })}
        {series.map((s) => (
          <g key={s.label}>
            <path d={buildPath(s.data)} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-1 rounded-full" style={{ background: s.color }} />
            <span className="text-xs text-atlab-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
