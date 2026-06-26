import { useMemo, useState } from 'react'
import {
  ShieldAlert, AlertTriangle, XCircle, Info, Shield, Eye, ChevronDown,
  ChevronRight, Search, Terminal, Network, HeartPulse, Server, Lock,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { analyzeAll, riskScore, riskLabel } from '../../lib/security'
import type { Finding, FindingSeverity, FindingCategory } from '../../lib/types'

const sevConfig: Record<FindingSeverity, { icon: typeof XCircle; color: string; bg: string; label: string }> = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Crítico' },
  high: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Alto' },
  medium: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Médio' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Baixo' },
  info: { icon: Info, color: 'text-atlab-400', bg: 'bg-atlab-500/10', label: 'Info' },
}

const catConfig: Record<FindingCategory, { icon: typeof Shield; label: string }> = {
  access: { icon: Lock, label: 'Acesso' },
  behavior: { icon: Terminal, label: 'Comportamento' },
  network: { icon: Network, label: 'Rede' },
  health: { icon: HeartPulse, label: 'Saúde' },
  system: { icon: Server, label: 'Sistema' },
}

export default function Security() {
  const { machines, sessions } = useApp()
  const findings = useMemo(() => analyzeAll(machines, sessions), [machines, sessions])
  const score = riskScore(findings.slice(0, 12))
  const risk = riskLabel(score)

  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState<'all' | FindingSeverity>('all')
  const [catFilter, setCatFilter] = useState<'all' | FindingCategory>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = findings.filter((f) => {
    const ms = f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.machineName.toLowerCase().includes(search.toLowerCase()) ||
      f.detail.toLowerCase().includes(search.toLowerCase())
    const fs = sevFilter === 'all' || f.severity === sevFilter
    const fc = catFilter === 'all' || f.category === catFilter
    return ms && fs && fc
  })

  const toggle = (id: string) => setExpanded((s) => {
    const next = new Set(s)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const countBySev = (sev: FindingSeverity) => findings.filter((f) => f.severity === sev).length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-accent-400" /> Análise de Vulnerabilidades
          </h1>
          <p className="text-atlab-400 mt-1">Motor de segurança · {findings.length} descobertas em {machines.length} máquinas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-atlab-500">Score de Risco</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: risk.color }}>{score}</p>
          </div>
          <div className="w-14 h-14 rounded-full border-4 flex items-center justify-center" style={{ borderColor: risk.color }}>
            <span className="text-[10px] font-bold" style={{ color: risk.color }}>{risk.label}</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(['critical', 'high', 'medium', 'low', 'info'] as FindingSeverity[]).map((sev) => {
          const c = sevConfig[sev]
          const Icon = c.icon
          const count = countBySev(sev)
          return (
            <button key={sev} onClick={() => setSevFilter(sevFilter === sev ? 'all' : sev)}
              className={`rounded-xl p-4 border transition-all text-left ${sevFilter === sev ? `${c.bg} border-current ${c.color}` : 'bg-atlab-900 border-atlab-800 hover:border-atlab-700'}`}>
              <Icon className={`w-5 h-5 mb-1 ${c.color}`} />
              <p className="text-2xl font-bold text-white tabular-nums">{count}</p>
              <p className="text-xs text-atlab-400">{c.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlab-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar vulnerabilidade, máquina..."
            className="w-full pl-10 pr-4 py-2.5 bg-atlab-900 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-accent-500 transition-colors" />
        </div>
        <div className="flex gap-1 bg-atlab-900 border border-atlab-700 rounded-lg p-1">
          {(['all', ...Object.keys(catConfig)] as ('all' | FindingCategory)[]).map((cat) => {
            const label = cat === 'all' ? 'Todas' : catConfig[cat].label
            return (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${catFilter === cat ? 'bg-accent-600 text-white' : 'text-atlab-400 hover:text-white'}`}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Findings list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-atlab-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma descoberta para os filtros selecionados</p>
          </div>
        )}
        {filtered.map((f) => <FindingCard key={f.id} finding={f} expanded={expanded.has(f.id)} onToggle={() => toggle(f.id)} />)}
      </div>
    </div>
  )
}

function FindingCard({ finding: f, expanded, onToggle }: { finding: Finding; expanded: boolean; onToggle: () => void }) {
  const sev = sevConfig[f.severity]
  const cat = catConfig[f.category]
  const SevIcon = sev.icon
  const CatIcon = cat.icon

  return (
    <div className={`bg-atlab-900 border rounded-xl overflow-hidden transition-all ${expanded ? 'border-atlab-700' : 'border-atlab-800'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-atlab-850 transition-colors">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${sev.bg}`}>
          <SevIcon className={`w-5 h-5 ${sev.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-white truncate">{f.title}</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-atlab-400">
            <span className="flex items-center gap-1"><Server className="w-3 h-3" /> {f.machineName}</span>
            <span className="flex items-center gap-1"><CatIcon className="w-3 h-3" /> {cat.label}</span>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${sev.bg} ${sev.color}`}>{sev.label.toUpperCase()}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-atlab-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-atlab-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-0 space-y-3 border-t border-atlab-800 animate-fade-in">
          <div className="flex items-start gap-2 mt-3">
            <Eye className="w-4 h-4 text-atlab-500 mt-0.5 shrink-0" />
            <p className="text-sm text-atlab-300">{f.detail}</p>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-300">{f.recommendation}</p>
          </div>
          {f.evidence && (
            <div className="bg-atlab-950 rounded-lg p-3 border border-atlab-800">
              <p className="text-[10px] text-atlab-500 uppercase mb-1">Evidência</p>
              <code className="text-xs text-red-300 font-mono">{f.evidence}</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
