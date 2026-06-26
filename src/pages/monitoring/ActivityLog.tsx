import { useState } from 'react'
import { Activity, Terminal, Plus, Settings, LogIn, Trash2, Network, Search } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { ActivityEvent } from '../../lib/types'

const typeConfig: Record<ActivityEvent['type'], { icon: typeof Activity; color: string; bg: string; label: string }> = {
  ssh: { icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'SSH' },
  provision: { icon: Plus, color: 'text-atlab-400', bg: 'bg-atlab-500/10', label: 'Provisão' },
  config: { icon: Settings, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Config' },
  auth: { icon: LogIn, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Auth' },
  delete: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Remoção' },
  network: { icon: Network, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Rede' },
}

function fullTime(ts: number) {
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ActivityLog() {
  const { activity } = useApp()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityEvent['type']>('all')

  const filtered = activity.filter((e) => {
    const matchSearch = e.action.toLowerCase().includes(search.toLowerCase()) || e.target.toLowerCase().includes(search.toLowerCase()) || e.user.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || e.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-atlab-400" /> Log de Atividades
        </h1>
        <p className="text-atlab-400 mt-1">Auditoria completa de ações na plataforma · {activity.length} eventos</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlab-500" />
          <input
            type="text"
            placeholder="Buscar ação, alvo ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-atlab-900 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-atlab-500"
          />
        </div>
        <div className="flex gap-1 bg-atlab-900 border border-atlab-700 rounded-lg p-1 flex-wrap">
          <button onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${typeFilter === 'all' ? 'bg-accent-600 text-white' : 'text-atlab-400 hover:text-white'}`}>Todos</button>
          {(Object.keys(typeConfig) as ActivityEvent['type'][]).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${typeFilter === t ? 'bg-accent-600 text-white' : 'text-atlab-400 hover:text-white'}`}>
              {typeConfig[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* timeline */}
      <div className="relative pl-6">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-atlab-800" />
        <div className="space-y-1">
          {filtered.map((e) => {
            const c = typeConfig[e.type]
            const Icon = c.icon
            return (
              <div key={e.id} className="relative flex items-center gap-4 py-2.5 group">
                <div className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center ${c.bg} ring-4 ring-atlab-950`}>
                  <Icon className={`w-3 h-3 ${c.color}`} />
                </div>
                <div className="flex-1 flex items-center gap-3 ml-2 px-4 py-2.5 rounded-lg group-hover:bg-atlab-900 transition-colors">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.color} uppercase font-medium shrink-0`}>{c.label}</span>
                  <span className="text-sm text-white">{e.action}</span>
                  <span className="text-sm text-atlab-400 font-mono">{e.target}</span>
                  <span className="text-xs text-atlab-500 ml-auto shrink-0">por <span className="text-atlab-400">{e.user}</span></span>
                  <span className="text-xs text-atlab-500 font-mono shrink-0 w-32 text-right">{fullTime(e.timestamp)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
