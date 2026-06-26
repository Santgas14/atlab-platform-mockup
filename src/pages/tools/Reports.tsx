import { useState } from 'react'
import { FileText, Download, Shield, Server, Activity, Network, Calendar, Loader2, Check } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { useAuth } from '../../store/AuthContext'
import { analyzeAll, riskScore, riskLabel } from '../../lib/security'
import { initialSubnets } from '../../lib/mockData'

type ReportType = 'inventory' | 'security' | 'audit' | 'network' | 'monthly'

interface ReportDef {
  id: ReportType
  icon: typeof FileText
  title: string
  description: string
  format: 'CSV' | 'JSON' | 'TXT'
}

const reports: ReportDef[] = [
  { id: 'inventory', icon: Server, title: 'Inventário de Máquinas', description: 'Lista completa com specs, IPs, status e grupo', format: 'CSV' },
  { id: 'security', icon: Shield, title: 'Relatório de Vulnerabilidades', description: 'Todas as descobertas de segurança com recomendações', format: 'JSON' },
  { id: 'audit', icon: Activity, title: 'Log de Auditoria', description: 'Histórico completo de atividades e sessões SSH', format: 'CSV' },
  { id: 'network', icon: Network, title: 'Mapa de Rede', description: 'Sub-redes, IPs alocados e capacidade', format: 'CSV' },
  { id: 'monthly', icon: Calendar, title: 'Resumo Mensal', description: 'Score de risco, incidentes, máquinas e uptime', format: 'TXT' },
]

export default function Reports() {
  const { machines, sessions, alerts, activity } = useApp()
  const { user } = useAuth()
  const [generating, setGenerating] = useState<ReportType | null>(null)
  const [generated, setGenerated] = useState<Set<ReportType>>(new Set())

  const findings = analyzeAll(machines, sessions)
  const score = riskScore(findings.slice(0, 12))
  const risk = riskLabel(score)

  const generate = (type: ReportType) => {
    setGenerating(type)
    setTimeout(() => {
      let content = ''
      let filename = ''
      const now = new Date().toISOString().split('T')[0]

      switch (type) {
        case 'inventory': {
          const header = 'Nome,IP,Tipo,OS,Cores,RAM(GB),Disco(GB),Status,Grupo,Node,Tags'
          const rows = machines.map((m) => `${m.name},${m.ip},${m.type},${m.os} ${m.osVersion},${m.cores},${m.ramGb},${m.diskGb},${m.status},${m.group},${m.node},"${m.tags.join(';')}"`)
          content = [header, ...rows].join('\n')
          filename = `atlab-inventory-${now}.csv`
          break
        }
        case 'security': {
          const data = { generatedAt: new Date().toISOString(), generatedBy: user?.email, riskScore: score, riskLabel: risk.label, totalFindings: findings.length, findings: findings.map((f) => ({ machine: f.machineName, severity: f.severity, category: f.category, title: f.title, detail: f.detail, recommendation: f.recommendation, evidence: f.evidence })) }
          content = JSON.stringify(data, null, 2)
          filename = `atlab-security-report-${now}.json`
          break
        }
        case 'audit': {
          const header = 'Timestamp,Ação,Alvo,Usuário,Tipo'
          const rows = activity.map((a) => `${new Date(a.timestamp).toISOString()},${a.action},${a.target},${a.user},${a.type}`)
          content = [header, ...rows].join('\n')
          filename = `atlab-audit-${now}.csv`
          break
        }
        case 'network': {
          const header = 'Sub-rede,Descrição,VLAN,Gateway,Total IPs,Usados,Disponíveis,Máquinas'
          const rows = initialSubnets.map((s) => {
            const subMachines = machines.filter((m) => m.ip.startsWith(s.network.split('.').slice(0, 3).join('.')))
            return `${s.network}${s.mask},${s.description},${s.vlan},${s.gateway},${s.totalIps},${s.usedIps},${s.totalIps - s.usedIps},"${subMachines.map((m) => m.name).join(';')}"`
          })
          content = [header, ...rows].join('\n')
          filename = `atlab-network-${now}.csv`
          break
        }
        case 'monthly': {
          const lines = [
            '═══════════════════════════════════════════',
            '   ATLAB · Relatório Mensal de Infraestrutura',
            `   Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            `   Gerado por: ${user?.name} (${user?.email})`,
            '═══════════════════════════════════════════',
            '',
            '▸ RESUMO DE RISCO',
            `  Score: ${score}/100 (${risk.label})`,
            `  Descobertas: ${findings.length} (${findings.filter((f) => f.severity === 'critical').length} críticas, ${findings.filter((f) => f.severity === 'high').length} altas)`,
            '',
            '▸ INFRAESTRUTURA',
            `  Máquinas totais: ${machines.length}`,
            `  Online: ${machines.filter((m) => m.status !== 'offline').length}`,
            `  Saudáveis: ${machines.filter((m) => m.status === 'healthy').length}`,
            `  Em alerta: ${machines.filter((m) => m.status === 'warning').length}`,
            `  Críticas: ${machines.filter((m) => m.status === 'critical').length}`,
            '',
            '▸ ALERTAS',
            `  Total: ${alerts.length}`,
            `  Não reconhecidos: ${alerts.filter((a) => !a.acknowledged).length}`,
            '',
            '▸ ATIVIDADES (últimas 50)',
            `  Sessões SSH: ${activity.filter((a) => a.type === 'ssh').length}`,
            `  Provisionamentos: ${activity.filter((a) => a.type === 'provision').length}`,
            `  Alterações de config: ${activity.filter((a) => a.type === 'config').length}`,
            '',
            '▸ REDE',
            `  Sub-redes: ${initialSubnets.length}`,
            `  IPs alocados: ${initialSubnets.reduce((s, n) => s + n.usedIps, 0)}`,
            '',
            '═══════════════════════════════════════════',
          ]
          content = lines.join('\n')
          filename = `atlab-monthly-${now}.txt`
          break
        }
      }

      // Download
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setGenerating(null)
      setGenerated((s) => new Set(s).add(type))
    }, 1500)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-accent-400" /> Relatórios
        </h1>
        <p className="text-atlab-400 mt-1">Exporte dados da plataforma em CSV, JSON ou texto</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon
          const isGenerating = generating === r.id
          const isDone = generated.has(r.id)
          return (
            <div key={r.id} className="bg-atlab-900 border border-atlab-800 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-atlab-800 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{r.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-atlab-800 rounded text-atlab-400">{r.format}</span>
                </div>
              </div>
              <p className="text-sm text-atlab-400 flex-1">{r.description}</p>
              <button
                onClick={() => generate(r.id)}
                disabled={isGenerating}
                className={`mt-4 w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  isDone ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-accent-600 hover:bg-accent-500 text-white'
                } disabled:opacity-60`}
              >
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> :
                  isDone ? <><Check className="w-4 h-4" /> Baixado</> :
                    <><Download className="w-4 h-4" /> Gerar e Baixar</>}
              </button>
            </div>
          )
        })}
      </div>

      {/* Quick stats */}
      <div className="mt-8 bg-atlab-900 border border-atlab-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Dados disponíveis para exportação</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div><p className="text-2xl font-bold text-white">{machines.length}</p><p className="text-xs text-atlab-400">Máquinas</p></div>
          <div><p className="text-2xl font-bold text-white">{findings.length}</p><p className="text-xs text-atlab-400">Vulnerabilidades</p></div>
          <div><p className="text-2xl font-bold text-white">{activity.length}</p><p className="text-xs text-atlab-400">Eventos</p></div>
          <div><p className="text-2xl font-bold text-white">{initialSubnets.length}</p><p className="text-xs text-atlab-400">Sub-redes</p></div>
          <div><p className="text-2xl font-bold text-white">{sessions.length}</p><p className="text-xs text-atlab-400">Sessões</p></div>
        </div>
      </div>
    </div>
  )
}
