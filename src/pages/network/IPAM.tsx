import { useState } from 'react'
import { Network, Plus, Search, Server, Globe } from 'lucide-react'
import { initialSubnets } from '../../lib/mockData'
import { useApp } from '../../store/AppContext'

export default function IPAM() {
  const { machines, toast } = useApp()
  const [selected, setSelected] = useState<string | null>(null)
  const subnet = initialSubnets.find((s) => s.id === selected)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IPAM</h1>
          <p className="text-atlab-400 mt-1">Gerenciamento de endereços IP · vínculo com máquinas</p>
        </div>
        <button onClick={() => toast('info', 'Criação de sub-rede em breve')} className="flex items-center gap-2 px-4 py-2.5 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nova Sub-rede
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlab-500" />
        <input type="text" placeholder="Buscar sub-rede ou IP..." className="w-full pl-10 pr-4 py-2.5 bg-atlab-900 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-accent-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {initialSubnets.map((s) => {
          const usage = (s.usedIps / s.totalIps) * 100
          const subnetMachines = machines.filter((m) => m.ip.startsWith(s.network.split('.').slice(0, 3).join('.')))
          return (
            <button key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)}
              className={`text-left bg-atlab-900 border rounded-xl p-5 transition-all ${selected === s.id ? 'border-accent-500 ring-1 ring-accent-500/20' : 'border-atlab-800 hover:border-atlab-700'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-atlab-800 rounded-lg flex items-center justify-center">
                  <Network className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white font-mono">{s.network}{s.mask}</h3>
                  <p className="text-xs text-atlab-400">{s.description}</p>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-atlab-400">{s.usedIps} / {s.totalIps} IPs</span>
                  <span className="text-atlab-300">{usage.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-atlab-850 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${usage < 60 ? 'bg-emerald-500' : usage < 80 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${usage}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-atlab-500">
                <span className="px-2 py-0.5 bg-atlab-800 rounded">{s.vlan}</span>
                <span className="font-mono">GW {s.gateway}</span>
              </div>
              {subnetMachines.length > 0 && (
                <div className="mt-3 pt-3 border-t border-atlab-800">
                  <p className="text-[10px] text-atlab-500 uppercase mb-1">Máquinas nesta sub-rede</p>
                  <div className="flex flex-wrap gap-1">
                    {subnetMachines.slice(0, 5).map((m) => (
                      <span key={m.id} className="text-[10px] px-1.5 py-0.5 bg-atlab-800 rounded text-atlab-300 font-mono">{m.name}</span>
                    ))}
                    {subnetMachines.length > 5 && <span className="text-[10px] text-atlab-500">+{subnetMachines.length - 5}</span>}
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* IP map + assignment table */}
      {subnet && (
        <div className="animate-fade-in space-y-6">
          {/* IP Grid */}
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Mapa de IPs · <span className="font-mono text-atlab-300">{subnet.network}{subnet.mask}</span></h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent-600" /> vinculado</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-atlab-800" /> livre</span>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(28px,1fr))] gap-1.5">
              {Array.from({ length: 64 }, (_, i) => {
                const lastOctet = i + 1
                const prefix = subnet.network.split('.').slice(0, 3).join('.')
                const ip = `${prefix}.${lastOctet}`
                const machine = machines.find((m) => m.ip === ip)
                const isGw = lastOctet === 1
                return (
                  <div key={i}
                    title={machine ? `${ip} → ${machine.name}` : isGw ? `${ip} (gateway)` : `${ip} — livre`}
                    className={`aspect-square rounded flex items-center justify-center text-[9px] font-mono cursor-default transition-colors ${
                      machine ? 'bg-accent-600 text-white hover:bg-accent-500' : isGw ? 'bg-yellow-600/30 text-yellow-400' : 'bg-atlab-850 text-atlab-600 hover:bg-atlab-800'
                    }`}>
                    {machine ? <Server className="w-3 h-3" /> : isGw ? <Globe className="w-3 h-3" /> : lastOctet}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-atlab-500 mt-3">Exibindo primeiros 64 endereços</p>
          </div>

          {/* Assignment table */}
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-atlab-800">
              <h3 className="font-semibold text-white text-sm">IPs vinculados nesta sub-rede</h3>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-atlab-800 text-xs text-atlab-500">
                <th className="text-left px-5 py-2">IP</th><th className="text-left px-5 py-2">Máquina</th><th className="text-left px-5 py-2">Tipo</th><th className="text-left px-5 py-2">Grupo</th><th className="text-left px-5 py-2">Status</th>
              </tr></thead>
              <tbody>
                {machines.filter((m) => m.ip.startsWith(subnet.network.split('.').slice(0, 3).join('.'))).map((m) => (
                  <tr key={m.id} className="border-b border-atlab-800/50 hover:bg-atlab-850 transition-colors">
                    <td className="px-5 py-2 font-mono text-white">{m.ip}</td>
                    <td className="px-5 py-2 text-atlab-200 font-medium">{m.name}</td>
                    <td className="px-5 py-2 text-atlab-400 uppercase text-xs">{m.type}</td>
                    <td className="px-5 py-2 text-atlab-400">{m.group}</td>
                    <td className="px-5 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : m.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : m.status === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-atlab-700 text-atlab-400'}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
