interface Segment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
  size?: number
  centerLabel?: string
  centerValue?: string
}

export default function DonutChart({ segments, size = 160, centerLabel, centerValue }: Props) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = size / 2 - 14
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {segments.map((seg) => {
          const frac = seg.value / total
          const dash = frac * circ
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
          )
          offset += dash
          return el
        })}
        {centerValue && (
          <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="fill-white rotate-90" style={{ fontSize: 22, fontWeight: 700, transformOrigin: 'center' }}>
            {centerValue}
          </text>
        )}
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: seg.color }} />
            <span className="text-sm text-atlab-300">{seg.label}</span>
            <span className="text-sm text-white font-medium ml-auto">{seg.value}</span>
          </div>
        ))}
        {centerLabel && <p className="text-xs text-atlab-500 pt-1">{centerLabel}</p>}
      </div>
    </div>
  )
}
