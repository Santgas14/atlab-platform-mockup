import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Server, Network, Cloud, Plus, KeyRound,
  Users, UserCircle, Activity, Bell, Workflow, GitBranch, Terminal, CornerDownLeft,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'

interface Command {
  id: string
  label: string
  hint: string
  icon: typeof Search
  action: () => void
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const { toast, setLive, live } = useApp()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const commands: Command[] = [
    { id: 'dash', label: 'Ir para Dashboard', hint: 'navegação', icon: LayoutDashboard, action: () => navigate('/') },
    { id: 'machines', label: 'Ir para Máquinas', hint: 'navegação', icon: Server, action: () => navigate('/machines') },
    { id: 'topo', label: 'Ver Topologia da Rede', hint: 'navegação', icon: GitBranch, action: () => navigate('/topology') },
    { id: 'ipam', label: 'Ir para IPAM', hint: 'navegação', icon: Network, action: () => navigate('/ipam') },
    { id: 'proxmox', label: 'Ir para Proxmox', hint: 'navegação', icon: Cloud, action: () => navigate('/proxmox') },
    { id: 'provision', label: 'Provisionar nova VM/Container', hint: 'ação', icon: Plus, action: () => navigate('/provision') },
    { id: 'alerts', label: 'Central de Alertas', hint: 'navegação', icon: Bell, action: () => navigate('/alerts') },
    { id: 'activity', label: 'Log de Atividades', hint: 'navegação', icon: Activity, action: () => navigate('/activity') },
    { id: 'automation', label: 'Automações', hint: 'navegação', icon: Workflow, action: () => navigate('/automation') },
    { id: 'creds', label: 'Credenciais', hint: 'navegação', icon: KeyRound, action: () => navigate('/credentials') },
    { id: 'groups', label: 'Grupos de Acesso', hint: 'navegação', icon: Users, action: () => navigate('/groups') },
    { id: 'account', label: 'Minha Conta', hint: 'navegação', icon: UserCircle, action: () => navigate('/account') },
    { id: 'ssh', label: 'Abrir Terminal SSH rápido', hint: 'ação', icon: Terminal, action: () => { navigate('/machines'); toast('info', 'Selecione uma máquina para conectar') } },
    { id: 'live', label: live ? 'Pausar métricas em tempo real' : 'Retomar métricas em tempo real', hint: 'sistema', icon: Activity, action: () => { setLive(!live); toast('info', live ? 'Métricas pausadas' : 'Métricas retomadas') } },
  ]

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))

  const run = (cmd: Command) => {
    cmd.action()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-atlab-900 border border-atlab-700 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-atlab-800">
          <Search className="w-5 h-5 text-atlab-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
              if (e.key === 'Enter' && filtered[selected]) run(filtered[selected])
            }}
            placeholder="Buscar comandos, páginas, ações..."
            className="flex-1 bg-transparent text-white placeholder-atlab-500 focus:outline-none"
          />
          <kbd className="text-xs px-2 py-1 bg-atlab-800 rounded text-atlab-400">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && <p className="text-center text-atlab-500 py-8 text-sm">Nenhum comando encontrado</p>}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.id}
                onClick={() => run(cmd)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  i === selected ? 'bg-accent-600 text-white' : 'text-atlab-300 hover:bg-atlab-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-sm">{cmd.label}</span>
                <span className="text-xs opacity-60">{cmd.hint}</span>
                {i === selected && <CornerDownLeft className="w-3.5 h-3.5 opacity-60" />}
              </button>
            )
          })}
        </div>
        <div className="px-4 py-2 border-t border-atlab-800 flex items-center gap-4 text-xs text-atlab-500">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-atlab-800 rounded">↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-atlab-800 rounded">↵</kbd> selecionar</span>
        </div>
      </div>
    </div>
  )
}
