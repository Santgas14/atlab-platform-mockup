import { useState } from 'react'
import { GitBranch, Server, Cloud, Box, Network as NetIcon } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { Machine } from '../../lib/types'

interface NodePos { id: string; x: number; y: number }

export default function Topology() {
  const { machines, nodes } = useApp()
  const [hover, setHover] = useState<string | null>(null)

  const W = 900, H = 560
  const coreX = W / 2, coreY = 90

  // Proxmox nodes spread horizontally
  const nodePositions: NodePos[] = nodes.map((n, i) => ({
    id: n.id,
    x: (W / (nodes.length + 1)) * (i + 1),
    y: 250,
  }))

  // machines grouped under their node
  const machinePositions: (NodePos & { machine: Machine })[] = []
  nodes.forEach((node) => {
    const np = nodePositions.find((p) => p.id === node.id)!
    const children = machines.filter((m) => m.node === node.name)
    children.forEach((m, i) => {
      const spread = (children.length - 1) * 70
      machinePositions.push({
        id: m.id,
        machine: m,
        x: np.x - spread / 2 + i * 70,
        y: 440,
      })
    })
  })

  const statusColor = (s: string) =>
    s === 'healthy' ? '#34d399' : s === 'warning' ? '#fbbf24' : s === 'critical' ? '#f87171' : '#475569'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-atlab-400" /> Topologia da Rede
        </h1>
        <p className="text-atlab-400 mt-1">Mapa interativo do cluster ATLAB · passe o mouse para detalhes</p>
      </div>

      <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-4 grid-bg overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 700 }}>
          {/* links core -> nodes */}
          {nodePositions.map((np) => {
            const node = nodes.find((n) => n.id === np.id)!
            return (
              <line key={`l-${np.id}`} x1={coreX} y1={coreY} x2={np.x} y2={np.y}
                stroke={node.status === 'connected' ? '#4f46e5' : '#334155'}
                strokeWidth="2" strokeDasharray={node.status === 'connected' ? '0' : '5 5'} />
            )
          })}
          {/* links nodes -> machines */}
          {machinePositions.map((mp) => {
            const node = nodes.find((n) => n.name === mp.machine.node)!
            const np = nodePositions.find((p) => p.id === node.id)!
            return (
              <line key={`ml-${mp.id}`} x1={np.x} y1={np.y} x2={mp.x} y2={mp.y}
                stroke={mp.machine.status === 'offline' ? '#334155' : '#3730a3'} strokeWidth="1.5" />
            )
          })}

          {/* Core */}
          <g>
            <circle cx={coreX} cy={coreY} r="38" fill="#4f46e5" fillOpacity="0.12" stroke="#6366f1" strokeWidth="2" className="animate-pulse" />
            <circle cx={coreX} cy={coreY} r="26" fill="#131519" stroke="#6366f1" strokeWidth="1.5" />
            <NetIcon x={coreX - 11} y={coreY - 11} width={22} height={22} className="text-atlab-300" />
            <text x={coreX} y={coreY + 56} textAnchor="middle" className="fill-white" style={{ fontSize: 13, fontWeight: 600 }}>ATLAB Core</text>
            <text x={coreX} y={coreY + 72} textAnchor="middle" className="fill-atlab-500" style={{ fontSize: 10 }}>10.0.0.1 · Gateway</text>
          </g>

          {/* Proxmox nodes */}
          {nodePositions.map((np) => {
            const node = nodes.find((n) => n.id === np.id)!
            const active = hover === np.id
            return (
              <g key={np.id} onMouseEnter={() => setHover(np.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                <circle cx={np.x} cy={np.y} r={active ? 32 : 28}
                  fill={node.status === 'connected' ? '#131519' : '#1e293b'}
                  stroke={node.status === 'connected' ? '#6366f1' : '#475569'} strokeWidth="2"
                  style={{ transition: 'r 0.2s' }} />
                <Cloud x={np.x - 11} y={np.y - 11} width={22} height={22}
                  className={node.status === 'connected' ? 'text-atlab-300' : 'text-slate-500'} />
                <text x={np.x} y={np.y + 48} textAnchor="middle" className="fill-white" style={{ fontSize: 12, fontWeight: 600 }}>{node.name}</text>
                <text x={np.x} y={np.y + 63} textAnchor="middle" className="fill-atlab-500" style={{ fontSize: 9 }}>
                  {node.status === 'connected' ? `CPU ${node.cpu.toFixed(0)}% · RAM ${node.ram.toFixed(0)}%` : 'desconectado'}
                </text>
              </g>
            )
          })}

          {/* Machines */}
          {machinePositions.map((mp) => {
            const active = hover === mp.id
            const color = statusColor(mp.machine.status)
            return (
              <g key={mp.id} onMouseEnter={() => setHover(mp.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                <rect x={mp.x - 18} y={mp.y - 18} width={36} height={36} rx={8}
                  fill="#0e0f13" stroke={color} strokeWidth={active ? 2.5 : 1.5} style={{ transition: 'all 0.2s' }} />
                {mp.machine.type === 'physical'
                  ? <Box x={mp.x - 9} y={mp.y - 9} width={18} height={18} style={{ color }} />
                  : <Server x={mp.x - 9} y={mp.y - 9} width={18} height={18} style={{ color }} />}
                <text x={mp.x} y={mp.y + 32} textAnchor="middle" className="fill-atlab-300" style={{ fontSize: 9 }}>{mp.machine.name}</text>
                {active && (
                  <g>
                    <rect x={mp.x - 70} y={mp.y - 86} width={140} height={56} rx={6} fill="#3730a3" stroke="#6366f1" strokeWidth="1" />
                    <text x={mp.x} y={mp.y - 68} textAnchor="middle" className="fill-white" style={{ fontSize: 10, fontWeight: 600 }}>{mp.machine.name}</text>
                    <text x={mp.x} y={mp.y - 54} textAnchor="middle" className="fill-atlab-200" style={{ fontSize: 8 }}>{mp.machine.ip} · {mp.machine.os}</text>
                    <text x={mp.x} y={mp.y - 40} textAnchor="middle" className="fill-atlab-300" style={{ fontSize: 8 }}>CPU {mp.machine.cpu.toFixed(0)}% · RAM {mp.machine.ram.toFixed(0)}%</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* legend */}
        <div className="flex items-center gap-5 mt-2 px-2 flex-wrap">
          {[['Saudável', '#34d399'], ['Alerta', '#fbbf24'], ['Crítico', '#f87171'], ['Offline', '#475569']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: c }} />
              <span className="text-xs text-atlab-400">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
