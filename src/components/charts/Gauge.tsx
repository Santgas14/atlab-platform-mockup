interface Props {
  value: number
  label: string
  sublabel?: string
  size?: number
}

function colorFor(v: number) {
  if (v < 60) return '#34d399'
  if (v < 80) return '#fbbf24'
  return '#f87171'
}

export default function Gauge({ value, label, sublabel, size = 140 }: Props) {
  const r = size / 2 - 12
  const circ = Math.PI * r // half circle
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circ - (clamped / 100) * circ
  const color = colorFor(clamped)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        <path
          d={`M 12 ${size / 2} A ${r} ${r} 0 0 1 ${size - 12} ${size / 2}`}
          fill="none"
          stroke="#191b21"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M 12 ${size / 2} A ${r} ${r} 0 0 1 ${size - 12} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s' }}
        />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="fill-white" style={{ fontSize: 26, fontWeight: 700 }}>
          {clamped.toFixed(0)}%
        </text>
      </svg>
      <p className="text-sm font-medium text-white -mt-1">{label}</p>
      {sublabel && <p className="text-xs text-atlab-400">{sublabel}</p>}
    </div>
  )
}
