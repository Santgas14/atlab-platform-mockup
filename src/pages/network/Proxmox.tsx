import { useState } from 'react'
import { Cloud, Server, CheckCircle, XCircle, Cpu, MemoryStick, HardDrive, Plus, Container, ChevronDown, ChevronRight, Monitor, Box } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import Sparkline from '../../components/charts/Sparkline'

const typeIcons = { vm: Monitor, ct: Container, physical: Box }

export default function Proxmox() {
  const { nodes, machines, toast } = useApp()
  const [expanded, setExpanded] = useState<Set<string>>(new Set(nodes.map((n) => n.id)))

  const toggle = (id: string) => setExpanded((s) => {
    const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proxmox</h1>
          <p className="text-atlab-400 mt-1">Nós e máquinas por nó</p>
        </div>
        <button onClick={() => toast('info', 'Assistente de conexão em breve')} className="flex items-center gap-2 px-4 py-2.5 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm font-medium">
          <Plus className="w-4 h-4" /> Conectar Nó
        </button>
      </div>

      <div className="space-y-4">
        {nodes.map((node) => {
          const isOpen = expanded.has(node.id)
          const children = machines.filter((m) => m.node === node.name)
          return (
            <div key={node.id} className="bg-atlab-900 border border-atlab-800 rounded-xl overflow-hidden">
              <button onClick={() => toggle(node.id)} className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-atlab-850 transition-colors">
                <div className="w-12 h-12 bg-atlab-800 rounded-xl flex items-center justify-center shrink-0">
                  <Cloud className="w-6 h-6 text-accent-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{node.name}</h3>
                    <span className="text-xs text-atlab-500 px-2 py-0.5 bg-atlab-800 rounded">v{node.version}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${node.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {node.status === 'connected' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {node.status === 'connected' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-sm text-atlab-400 font-mono">{node.host} · {node.cpuModel} · {node.uptimeDays}d uptime</p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <Stat label="CPU" value={`${node.cpu.toFixed(0)}%`} warn={node.cpu > 80} />
                  <Stat label="RAM" value={`${node.ram.toFixed(0)}%`} warn={node.ram > 80} />
                  <Stat label="Disco" value={`${node.disk}%`} />
                  <Stat label="VMs" value={`${node.vms}`} />
                  <Stat label="CTs" value={`${node.containers}`} />
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5 text-atlab-500 shrink-0" /> : <ChevronRight className="w-5 h-5 text-atlab-500 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-atlab-800">
                  {node.status === 'connected' && (
                    <div className="px-6 py-3 grid grid-cols-2 gap-4 bg-atlab-850">
                      <div><p className="text-xs text-atlab-500 mb-1">CPU ({node.cores} cores)</p><Sparkline data={Array.from({ length: 30 }, (_, i) => node.cpu + Math.sin(i * 0.5) * 8)} color="#6366f1" height={28} /></div>
                      <div><p className="text-xs text-atlab-500 mb-1">RAM ({node.ramTotalGb}GB)</p><Sparkline data={Array.from({ length: 30 }, (_, i) => node.ram + Math.cos(i * 0.4) * 5)} color="#a78bfa" height={28} /></div>
                    </div>
                  )}
                  {children.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-atlab-800 text-xs text-atlab-500">
                        <th className="text-left px-6 py-2">Nome</th><th className="text-left px-4 py-2">Tipo</th><th className="text-left px-4 py-2">IP</th><th className="text-left px-4 py-2">SO</th><th className="text-left px-4 py-2">CPU</th><th className="text-left px-4 py-2">RAM</th><th className="text-left px-4 py-2">Status</th>
                      </tr></thead>
                      <tbody>
                        {children.map((m) => {
                          const TypeIcon = typeIcons[m.type]
                          return (
                            <tr key={m.id} className="border-b border-atlab-800/50 hover:bg-atlab-850 transition-colors">
                              <td className="px-6 py-2.5 flex items-center gap-2"><TypeIcon className="w-4 h-4 text-atlab-500" /><span className="text-white font-medium">{m.name}</span></td>
                              <td className="px-4 py-2.5 text-atlab-400 uppercase text-xs">{m.type}</td>
                              <td className="px-4 py-2.5 text-atlab-300 font-mono">{m.ip}</td>
                              <td className="px-4 py-2.5 text-atlab-400">{m.os} {m.osVersion}</td>
                              <td className="px-4 py-2.5"><span className={`font-mono tabular-nums ${m.cpu > 80 ? 'text-red-400' : 'text-white'}`}>{m.cpu.toFixed(0)}%</span></td>
                              <td className="px-4 py-2.5"><span className={`font-mono tabular-nums ${m.ram > 80 ? 'text-red-400' : 'text-white'}`}>{m.ram.toFixed(0)}%</span></td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : m.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : m.status === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-atlab-700 text-atlab-400'}`}>{m.status}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="px-6 py-4 text-sm text-atlab-500">Nenhuma máquina registrada neste nó</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-atlab-500">{label}</p>
    </div>
  )
}
