import { useEffect, useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Server, Network, Cloud, Plus, KeyRound, Users, UserCircle,
  Terminal, Activity, Bell, Workflow, GitBranch, Search, Radio, Pause, ShieldAlert,
  FileCode, FileText, Sun, Moon, LogOut, MessageCircle, Power, Wifi, Lock, Columns,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { useAuth } from '../../store/AuthContext'
import { useTheme } from '../../store/ThemeContext'
import { analyzeAll, riskScore, riskLabel } from '../../lib/security'

const navSections = [
  {
    title: 'Operação',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/machines', icon: Server, label: 'Máquinas' },
      { to: '/topology', icon: GitBranch, label: 'Topologia' },
      { to: '/proxmox', icon: Cloud, label: 'Proxmox' },
      { to: '/provision', icon: Plus, label: 'Provisionar' },
      { to: '/shutdown', icon: Power, label: 'Desligamento' },
      { to: '/wol', icon: Wifi, label: 'Wake-on-LAN' },
      { to: '/multiterminal', icon: Columns, label: 'Multi Terminal' },
    ],
  },
  {
    title: 'Segurança & Monitoramento',
    items: [
      { to: '/security', icon: ShieldAlert, label: 'Segurança' },
      { to: '/lockdown', icon: Lock, label: 'Lockdown' },
      { to: '/ipam', icon: Network, label: 'IPAM' },
      { to: '/alerts', icon: Bell, label: 'Alertas' },
      { to: '/activity', icon: Activity, label: 'Atividades' },
      { to: '/automation', icon: Workflow, label: 'Automações' },
      { to: '/playbooks', icon: FileCode, label: 'Playbooks' },
      { to: '/reports', icon: FileText, label: 'Relatórios' },
      { to: '/notifications', icon: MessageCircle, label: 'Notificações' },
    ],
  },
  {
    title: 'Acesso',
    items: [
      { to: '/credentials', icon: KeyRound, label: 'Credenciais' },
      { to: '/groups', icon: Users, label: 'Grupos' },
      { to: '/account', icon: UserCircle, label: 'Conta' },
    ],
  },
]

export default function Layout() {
  const { alerts, live, setLive, machines, sessions } = useApp()
  const { user, logout } = useAuth()
  const { toggle: toggleTheme, isDark } = useTheme()
  const [now, setNow] = useState(new Date())
  const unack = alerts.filter((a) => !a.acknowledged).length

  const findings = analyzeAll(machines, sessions)
  const score = riskScore(findings.slice(0, 8))
  const risk = riskLabel(score)
  const critFindings = findings.filter((f) => f.severity === 'critical').length

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-atlab-900 border-r border-atlab-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-atlab-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg flex items-center justify-center shadow-lg shadow-accent-600/20">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-[0.2em]">ATLAB</h1>
              <p className="text-[10px] text-atlab-400 uppercase tracking-wide">Alan Turing Lab</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-atlab-500 uppercase tracking-wider">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-accent-600 text-white shadow-lg shadow-accent-600/20'
                          : 'text-atlab-300 hover:bg-atlab-800 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {item.to === '/alerts' && unack > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">{unack}</span>
                    )}
                    {item.to === '/security' && critFindings > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">{critFindings}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Risk meter */}
        <div className="px-3 pb-2">
          <NavLink to="/security" className="block p-3 rounded-lg bg-atlab-850 border border-atlab-800 hover:border-atlab-700 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-atlab-500">Risco Global</span>
              <span className="text-[10px] font-bold" style={{ color: risk.color }}>{risk.label}</span>
            </div>
            <div className="h-1.5 bg-atlab-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: risk.color }} />
            </div>
          </NavLink>
        </div>

        <div className="p-3 border-t border-atlab-800">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <button onClick={toggleTheme} className="p-2 hover:bg-atlab-800 rounded-lg text-atlab-400 hover:text-white transition-colors" title="Alternar tema">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={logout} className="p-2 hover:bg-red-500/10 rounded-lg text-atlab-400 hover:text-red-400 transition-colors" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-atlab-850">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-700 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">{user?.avatar || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-atlab-400 truncate">{user?.email || ''}</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 bg-accent-600/20 text-accent-300 rounded capitalize">{user?.role}</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-atlab-900/60 backdrop-blur-md border-b border-atlab-800 flex items-center justify-between px-6 shrink-0">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="flex items-center gap-3 px-4 py-2 bg-atlab-850 hover:bg-atlab-800 border border-atlab-700 rounded-lg text-atlab-400 text-sm transition-colors w-80"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Buscar ou executar comando...</span>
            <kbd className="text-xs px-1.5 py-0.5 bg-atlab-900 rounded border border-atlab-700">Ctrl K</kbd>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLive(!live)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                live ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-atlab-800 text-atlab-400 border border-atlab-700'
              }`}
            >
              {live ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : <Pause className="w-3.5 h-3.5" />}
              {live ? 'AO VIVO' : 'PAUSADO'}
            </button>

            <NavLink to="/alerts" className="relative p-2 hover:bg-atlab-800 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-atlab-300" />
              {unack > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-glow">
                  {unack}
                </span>
              )}
            </NavLink>

            <div className="text-right">
              <p className="text-sm font-mono text-white tabular-nums">{now.toLocaleTimeString('pt-BR')}</p>
              <p className="text-[10px] text-atlab-500">{now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-atlab-950">
          <div className="p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
