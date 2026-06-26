import { useState } from 'react'
import {
  Server, Terminal, Search, Cpu, MemoryStick, HardDrive, Globe,
  Play, Square, RotateCw, Box, Monitor, Tag, X, Thermometer,
  Gauge, Wifi, Copy, ExternalLink, FileText, ShieldAlert, Clock,
  Container,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { Machine, HealthStatus } from '../../lib/types'
import Sparkline from '../../components/charts/Sparkline'
import SSHTerminal from '../../components/terminal/SSHTerminal'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { sshCommand, sshConfigBlock, termiusJson, sshUri } from '../../lib/sshExport'
import { analyzeMachine } from '../../lib/security'

const statusDot: Record<HealthStatus, string> = {
  healthy: 'bg-emerald-400', warning: 'bg-yellow-400', critical: 'bg-red-400', offline: 'bg-slate-500',
}
const typeIcon = { vm: Monitor, ct: Container, physical: Box }
const typeLabel = { vm: 'VM', ct: 'Container', physical: 'Baremetal' }
const typeColor = { vm: 'text-blue-400 bg-blue-500/10', ct: 'text-purple-400 bg-purple-500/10', physical: 'text-orange-400 bg-orange-500/10' }

export default function Machines() {
  const { machines, sessions, controlMachine, logActivity, toast } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | HealthStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'vm' | 'ct' | 'physical'>('all')
  const [terminal, setTerminal] = useState<Machine | null>(null)
  const [detail, setDetail] = useState<Machine | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ machine: Machine; action: 'stop' | 'reboot' } | null>(null)

  const filtered = machines.filter((m) => {
    const ms = m.name.toLowerCase().includes(search.toLowerCase()) || m.ip.includes(search) || m.group.toLowerCase().includes(search.toLowerCase()) || m.tags.some((t) => t.includes(search.toLowerCase()))
    const statusOk = filter === 'all' || m.status === filter
    const typeOk = typeFilter === 'all' || m.type === typeFilter
    return ms && statusOk && typeOk
  })

  const openSSH = (m: Machine) => {
    if (m.status === 'offline') { toast('error', `${m.name} está offline`); return }
    setTerminal(m)
    logActivity('Conexão SSH iniciada', m.name, 'ssh')
  }

  const handleMachineAction = (m: Machine, action: 'stop' | 'reboot') => {
    setConfirmAction({ machine: m, action })
  }

  const executeAction = () => {
    if (!confirmAction) return
    controlMachine(confirmAction.machine.id, confirmAction.action)
    setConfirmAction(null)
  }

  // Stats
  const baremetals = machines.filter((m) => m.type === 'physical').length
  const vms = machines.filter((m) => m.type === 'vm').length
  const cts = machines.filter((m) => m.type === 'ct').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Máquinas</h1>
        <p className="text-atlab-400 mt-1">{filtered.length} máquinas · {baremetals} baremetal · {vms} VMs · {cts} containers</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlab-500" />
          <input type="text" placeholder="Buscar nome, IP, grupo ou tag..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-atlab-900 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-accent-500" />
        </div>
        <div className="flex gap-1 bg-atlab-900 border border-atlab-700 rounded-lg p-1">
          {(['all', 'healthy', 'warning', 'critical', 'offline'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-accent-600 text-white' : 'text-atlab-400 hover:text-white'}`}>
              {f === 'all' ? 'Todas' : f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-atlab-900 border border-atlab-700 rounded-lg p-1">
          {(['all', 'physical', 'vm', 'ct'] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === t ? 'bg-accent-600 text-white' : 'text-atlab-400 hover:text-white'}`}>
              {t === 'all' ? 'Todos tipos' : typeLabel[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((m) => {
          const TypeIcon = typeIcon[m.type]
          return (
            <div key={m.id} className="bg-atlab-900 border border-atlab-800 rounded-xl p-5 hover:border-atlab-700 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setDetail(m)}>
                  <div className="w-10 h-10 bg-atlab-800 rounded-lg flex items-center justify-center">
                    <TypeIcon className="w-5 h-5 text-atlab-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{m.name}</h3>
                    <p className="text-xs text-atlab-400">{m.group} · {m.node}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`flex items-center gap-1.5 text-xs text-atlab-300`}>
                    <span className={`w-2 h-2 rounded-full ${statusDot[m.status]} ${m.status !== 'offline' ? 'animate-pulse' : ''}`} />
                    {m.status}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColor[m.type]}`}>
                    {typeLabel[m.type]}
                  </span>
                </div>
              </div>

              <div className="mb-3 -mx-1">
                <Sparkline data={m.history} color={m.cpu > 80 ? '#f87171' : m.cpu > 60 ? '#fbbf24' : '#6366f1'} height={34} />
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                <MetricMini icon={Cpu} value={`${m.cpu.toFixed(0)}%`} warn={m.cpu > 80} />
                <MetricMini icon={MemoryStick} value={`${m.ram.toFixed(0)}%`} warn={m.ram > 80} />
                <MetricMini icon={Thermometer} value={`${m.cpuTempC}°`} warn={m.cpuTempC > 80} />
                <MetricMini icon={Wifi} value={`${m.netDownMbps.toFixed(0)}`} label="Mb/s" />
              </div>

              <div className="flex items-center gap-2 mb-3 text-xs text-atlab-400">
                <Globe className="w-3.5 h-3.5" /> <span className="font-mono">{m.ip}</span>
                <span className="ml-auto px-1.5 py-0.5 bg-atlab-800 rounded text-[10px]">{m.os} {m.osVersion}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {m.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-atlab-800 rounded text-atlab-400">
                    <Tag className="w-2.5 h-2.5" />{t}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => openSSH(m)} disabled={m.status === 'offline'}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${m.status === 'offline' ? 'bg-atlab-800 text-atlab-600 cursor-not-allowed' : 'bg-accent-600 hover:bg-accent-500 text-white'}`}>
                  <Terminal className="w-4 h-4" /> SSH
                </button>
                <button onClick={() => setDetail(m)} className="p-2 bg-atlab-800 hover:bg-atlab-700 text-atlab-300 rounded-lg" title="Detalhes">
                  <Gauge className="w-4 h-4" />
                </button>
                {m.status === 'offline' ? (
                  <button onClick={() => controlMachine(m.id, 'start')} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg"><Play className="w-4 h-4" /></button>
                ) : (
                  <>
                    <button onClick={() => handleMachineAction(m, 'reboot')} className="p-2 bg-atlab-800 hover:bg-atlab-700 text-atlab-300 rounded-lg" title="Reiniciar"><RotateCw className="w-4 h-4" /></button>
                    <button onClick={() => handleMachineAction(m, 'stop')} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg" title="Desligar"><Square className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {terminal && <SSHTerminal machine={terminal} onClose={() => setTerminal(null)} />}
      {detail && <MachineDetail machine={detail} onClose={() => setDetail(null)} />}

      {/* Confirm dialog for stop/reboot */}
      {confirmAction && (
        <ConfirmDialog
          open={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={executeAction}
          title={confirmAction.action === 'stop'
            ? `Desligar ${confirmAction.machine.name}?`
            : `Reiniciar ${confirmAction.machine.name}?`}
          message={confirmAction.action === 'stop'
            ? `Tem certeza que deseja desligar ${confirmAction.machine.name}? ${confirmAction.machine.type === 'physical' ? 'Esta é uma máquina BAREMETAL — será necessário acesso físico ou IPMI para religá-la.' : 'A máquina ficará offline até ser iniciada novamente.'}`
            : `${confirmAction.machine.name} será reiniciada. Todos os serviços serão temporariamente indisponíveis.`}
          confirmText={confirmAction.action === 'stop' ? 'Sim, desligar' : 'Sim, reiniciar'}
          danger={confirmAction.action === 'stop'}
          isBaremetal={confirmAction.machine.type === 'physical'}
          requireTyping={confirmAction.machine.type === 'physical' && confirmAction.action === 'stop' ? confirmAction.machine.name : undefined}
        />
      )}
    </div>
  )
}

function MetricMini({ icon: Icon, value, warn, label }: { icon: typeof Cpu; value: string; warn?: boolean; label?: string }) {
  return (
    <div className="bg-atlab-850 rounded-lg py-1.5">
      <Icon className={`w-3 h-3 mx-auto mb-0.5 ${warn ? 'text-red-400' : 'text-atlab-500'}`} />
      <p className={`text-xs font-mono font-semibold tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {label && <p className="text-[9px] text-atlab-500">{label}</p>}
    </div>
  )
}

function MachineDetail({ machine: m, onClose }: { machine: Machine; onClose: () => void }) {
  const { sessions } = useApp()
  const [tab, setTab] = useState<'metrics' | 'security' | 'sessions' | 'export'>('metrics')
  const findings = analyzeMachine(m, sessions)
  const machineSessions = sessions.filter((s) => s.machineId === m.id)

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[85vh] bg-atlab-900 border border-atlab-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-atlab-800">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-accent-400" />
            <div>
              <h2 className="text-lg font-bold text-white">{m.name}</h2>
              <p className="text-xs text-atlab-400">{m.ip} · {m.os} {m.osVersion} · {m.kernel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-atlab-800 rounded-lg text-atlab-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* tabs */}
        <div className="flex border-b border-atlab-800 px-6">
          {([['metrics', 'Métricas'], ['security', 'Segurança'], ['sessions', 'Sessões'], ['export', 'Exportar SSH']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === k ? 'border-accent-500 text-white' : 'border-transparent text-atlab-400 hover:text-white'}`}>
              {l}
              {k === 'security' && findings.length > 0 && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full">{findings.length}</span>}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'metrics' && <MetricsTab m={m} />}
          {tab === 'security' && <SecurityTab findings={findings} m={m} />}
          {tab === 'sessions' && <SessionsTab sessions={machineSessions} />}
          {tab === 'export' && <ExportTab m={m} />}
        </div>
      </div>
    </div>
  )
}

function MetricsTab({ m }: { m: Machine }) {
  const loadColor = (v: number, max: number) => v > max * 0.85 ? 'text-red-400' : v > max * 0.6 ? 'text-yellow-400' : 'text-emerald-400'
  const barColor = (pct: number) => pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-accent-500'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── CPU Section ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-400" /> Processamento
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-atlab-400">Load Avg:</span>
            <span className={loadColor(m.loadAvg[0], m.cores)}>{m.loadAvg[0].toFixed(2)}</span>
            <span className={loadColor(m.loadAvg[1], m.cores)}>{m.loadAvg[1].toFixed(2)}</span>
            <span className={loadColor(m.loadAvg[2], m.cores)}>{m.loadAvg[2].toFixed(2)}</span>
            <span className="text-atlab-500">({m.cores} cores)</span>
          </div>
        </div>
        {/* Core bars */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {m.coreLoads.map((c) => (
            <div key={c.core} className="bg-atlab-850 rounded-lg p-1.5 text-center group relative">
              <div className="w-full h-10 bg-atlab-900 rounded relative overflow-hidden mb-0.5">
                <div className={`absolute bottom-0 w-full rounded transition-all ${barColor(c.load)}`} style={{ height: `${c.load}%` }} />
              </div>
              <p className="text-[9px] font-mono text-atlab-300">{c.load.toFixed(0)}%</p>
              <p className="text-[8px] text-atlab-500">{c.tempC}°</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-2 text-xs text-atlab-400">
          <span>Uso global: <span className={`font-bold ${m.cpu > 80 ? 'text-red-400' : 'text-white'}`}>{m.cpu.toFixed(1)}%</span></span>
          <span>Temperatura: <span className={`font-bold ${m.cpuTempC > 80 ? 'text-red-400' : 'text-white'}`}>{m.cpuTempC}°C</span></span>
          <span>Processos: <span className="text-white">{m.processesTotal}</span>{m.processesZombie > 0 && <span className="text-red-400 ml-1">({m.processesZombie} zombie)</span>}</span>
        </div>
      </section>

      {/* ─── Memory Section ────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <MemoryStick className="w-4 h-4 text-accent-400" /> Memória
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RAM */}
          <div className="bg-atlab-850 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-atlab-400">RAM</span>
              <span className="text-xs font-mono text-white">{(m.ramGb * m.ram / 100).toFixed(1)} / {m.ramGb} GB</span>
            </div>
            <div className="h-3 bg-atlab-900 rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full transition-all ${barColor(m.ram)}`} style={{ width: `${m.ram}%` }} />
            </div>
            <p className={`text-right text-xs font-bold ${m.ram > 85 ? 'text-red-400' : 'text-atlab-300'}`}>{m.ram.toFixed(1)}%</p>
          </div>
          {/* Swap */}
          <div className="bg-atlab-850 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-atlab-400">Swap</span>
              <span className="text-xs font-mono text-white">{m.swapUsedMb} / {m.swapTotalMb} MB</span>
            </div>
            <div className="h-3 bg-atlab-900 rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full ${m.swapUsedMb > 0 ? 'bg-yellow-500' : 'bg-atlab-700'}`} style={{ width: `${(m.swapUsedMb / m.swapTotalMb) * 100}%` }} />
            </div>
            <p className={`text-right text-xs ${m.swapUsedMb > 512 ? 'text-yellow-400 font-bold' : 'text-atlab-500'}`}>
              {m.swapUsedMb === 0 ? 'não utilizado' : `${((m.swapUsedMb / m.swapTotalMb) * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Disk I/O Section ──────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-accent-400" /> Armazenamento & I/O
        </h3>
        {/* Disk mounts */}
        <div className="space-y-2 mb-4">
          {m.disks.map((d) => (
            <div key={d.device} className="bg-atlab-850 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-atlab-300">{d.device}</span>
                  <span className="text-[10px] text-atlab-500">→ {d.mount}</span>
                  {d.health !== 'OK' && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">SMART: {d.health}</span>}
                </div>
                <span className="text-xs text-atlab-400">{d.sizeGb}GB</span>
              </div>
              <div className="h-2 bg-atlab-900 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor(d.usedPct)}`} style={{ width: `${d.usedPct}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-atlab-500">
                <span>{Math.floor(d.sizeGb * d.usedPct / 100)}GB usado</span>
                <span className={d.usedPct > 90 ? 'text-red-400 font-bold' : ''}>{d.usedPct}%</span>
              </div>
            </div>
          ))}
        </div>
        {/* IOPS + Latency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white tabular-nums">{m.iopsRead.toLocaleString()}</p>
            <p className="text-[10px] text-atlab-500">IOPS Read</p>
          </div>
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white tabular-nums">{m.iopsWrite.toLocaleString()}</p>
            <p className="text-[10px] text-atlab-500">IOPS Write</p>
          </div>
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className={`text-lg font-bold tabular-nums ${m.diskLatencyMs > 10 ? 'text-red-400' : m.diskLatencyMs > 5 ? 'text-yellow-400' : 'text-white'}`}>{m.diskLatencyMs.toFixed(1)}ms</p>
            <p className="text-[10px] text-atlab-500">Latência I/O</p>
          </div>
        </div>
      </section>

      {/* ─── Network Section ───────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-accent-400" /> Rede
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-emerald-400 tabular-nums">↓ {m.netDownMbps.toFixed(0)}</p>
            <p className="text-[10px] text-atlab-500">Download Mbps</p>
          </div>
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-blue-400 tabular-nums">↑ {m.netUpMbps.toFixed(0)}</p>
            <p className="text-[10px] text-atlab-500">Upload Mbps</p>
          </div>
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white tabular-nums">{m.tcpConnections}</p>
            <p className="text-[10px] text-atlab-500">Conexões TCP</p>
          </div>
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className={`text-lg font-bold tabular-nums ${m.netErrors > 0 ? 'text-red-400' : 'text-white'}`}>{m.netErrors}</p>
            <p className="text-[10px] text-atlab-500">Erros/Drops</p>
          </div>
        </div>
      </section>

      {/* ─── GPU Section ───────────────────────────────────────── */}
      {m.gpu && (
        <section>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-accent-400">⚡</span> GPU · {m.gpu.model}
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <GpuStat label="Uso" value={`${m.gpu.usage}%`} warn={m.gpu.usage > 85} />
            <GpuStat label="VRAM" value={`${m.gpu.memUsedGb.toFixed(1)}/${m.gpu.memTotalGb}G`} warn={m.gpu.memUsedGb / m.gpu.memTotalGb > 0.85} />
            <GpuStat label="Temp" value={`${m.gpu.tempC}°C`} warn={m.gpu.tempC > 80} />
            <GpuStat label="Fan" value={`${m.gpu.fanPct}%`} />
            <GpuStat label="Clock" value={`${m.gpu.clockMhz}MHz`} />
            <GpuStat label="Potência" value={`${m.gpu.powerW}W`} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <GpuStat label="Mem Clock" value={`${m.gpu.memClockMhz}MHz`} />
            <GpuStat label="Encoder" value={`${m.gpu.encoderPct}%`} />
            <GpuStat label="Decoder" value={`${m.gpu.decoderPct}%`} />
          </div>
        </section>
      )}

      {/* ─── Top Processes ─────────────────────────────────────── */}
      {m.topProcesses.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-white mb-3">📊 Top Processos</h3>
          <div className="bg-atlab-850 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-atlab-800 text-atlab-500">
                <th className="text-left px-3 py-2">PID</th><th className="text-left px-3 py-2">Nome</th><th className="text-left px-3 py-2">User</th><th className="text-right px-3 py-2">CPU%</th><th className="text-right px-3 py-2">RAM%</th><th className="text-center px-3 py-2">Estado</th>
              </tr></thead>
              <tbody>
                {m.topProcesses.map((p) => (
                  <tr key={p.pid} className="border-b border-atlab-800/50 hover:bg-atlab-800/30">
                    <td className="px-3 py-1.5 text-atlab-400 font-mono">{p.pid}</td>
                    <td className="px-3 py-1.5 text-white font-medium">{p.name}</td>
                    <td className="px-3 py-1.5 text-atlab-400">{p.user}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${p.cpu > 50 ? 'text-red-400' : p.cpu > 20 ? 'text-yellow-400' : 'text-atlab-300'}`}>{p.cpu.toFixed(1)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${p.ram > 30 ? 'text-yellow-400' : 'text-atlab-300'}`}>{p.ram.toFixed(1)}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.state === 'R' ? 'bg-emerald-500/10 text-emerald-400' : p.state === 'D' ? 'bg-red-500/10 text-red-400' : p.state === 'Z' ? 'bg-red-500/10 text-red-400' : 'bg-atlab-800 text-atlab-400'}`}>
                        {p.state === 'R' ? 'running' : p.state === 'S' ? 'sleeping' : p.state === 'D' ? 'disk wait' : p.state === 'Z' ? 'zombie' : 'stopped'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── Containers ────────────────────────────────────────── */}
      {m.containers.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-white mb-3">🐳 Containers ({m.containers.length})</h3>
          <div className="space-y-2">
            {m.containers.map((c) => (
              <div key={c.id} className="bg-atlab-850 rounded-lg p-3 flex items-center gap-4">
                <div className={`w-2 h-8 rounded-full ${c.status === 'running' ? 'bg-emerald-500' : c.status === 'restarting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{c.name}</span>
                    <span className="text-[10px] text-atlab-500 font-mono">{c.image}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-[10px] text-atlab-400">
                    <span>CPU: {c.cpuPct}%</span>
                    <span>RAM: {c.ramMb}MB</span>
                    <span>Up: {c.uptimeHours > 0 ? `${Math.floor(c.uptimeHours / 24)}d` : '—'}</span>
                    {c.restarts > 0 && <span className="text-yellow-400">🔄 {c.restarts} restarts</span>}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'restarting' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Security & SSH Stats ──────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-white mb-3">🔒 Acesso & Segurança</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white tabular-nums">{m.sshActiveSessions}</p>
            <p className="text-[10px] text-atlab-500">SSH ativos</p>
          </div>
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className={`text-lg font-bold tabular-nums ${m.failedLoginAttempts > 10 ? 'text-red-400' : 'text-white'}`}>{m.failedLoginAttempts}</p>
            <p className="text-[10px] text-atlab-500">Login falhos</p>
          </div>
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white tabular-nums">{m.users.length}</p>
            <p className="text-[10px] text-atlab-500">Usuários</p>
          </div>
          <div className="bg-atlab-850 rounded-lg p-3 text-center">
            <p className={`text-lg font-bold tabular-nums ${!m.firewallEnabled ? 'text-red-400' : 'text-emerald-400'}`}>{m.firewallEnabled ? 'ON' : 'OFF'}</p>
            <p className="text-[10px] text-atlab-500">Firewall</p>
          </div>
        </div>
        {/* Users table */}
        <div className="bg-atlab-850 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-atlab-800 text-atlab-500">
              <th className="text-left px-3 py-2">Usuário</th><th className="text-left px-3 py-2">Sudo</th><th className="text-left px-3 py-2">Auth</th><th className="text-left px-3 py-2">Último IP</th>
            </tr></thead>
            <tbody>
              {m.users.map((u) => (
                <tr key={u.username} className="border-b border-atlab-800/50">
                  <td className="px-3 py-1.5 text-white font-mono">{u.username}</td>
                  <td className="px-3 py-1.5">{u.sudo ? <span className="text-red-400">sim</span> : <span className="text-atlab-500">não</span>}</td>
                  <td className="px-3 py-1.5">{u.sshKeyOnly ? <span className="text-emerald-400">key-only</span> : <span className="text-yellow-400">senha</span>}</td>
                  <td className="px-3 py-1.5 text-atlab-400 font-mono">{u.fromIp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function GpuStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-atlab-850 rounded-lg p-2.5 text-center">
      <p className={`text-sm font-bold tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="text-[9px] text-atlab-500 mt-0.5">{label}</p>
    </div>
  )
}

function SecurityTab({ findings, m }: { findings: ReturnType<typeof analyzeMachine>; m: Machine }) {
  return (
    <div className="animate-fade-in space-y-3">
      {findings.length === 0 && <p className="text-emerald-400 py-8 text-center text-sm">✓ Nenhuma vulnerabilidade detectada</p>}
      {findings.map((f) => (
        <div key={f.id} className="bg-atlab-850 rounded-lg p-4 border-l-4" style={{ borderLeftColor: f.severity === 'critical' ? '#f87171' : f.severity === 'high' ? '#fb923c' : f.severity === 'medium' ? '#fbbf24' : '#818cf8' }}>
          <p className="text-sm font-medium text-white">{f.title}</p>
          <p className="text-xs text-atlab-400 mt-1">{f.detail}</p>
          <p className="text-xs text-emerald-300 mt-1">↳ {f.recommendation}</p>
          {f.evidence && <code className="block text-xs text-red-300 mt-1 font-mono bg-atlab-900 rounded px-2 py-1">{f.evidence}</code>}
        </div>
      ))}
      <div className="pt-4 border-t border-atlab-800">
        <p className="text-xs text-atlab-500">Config: Root SSH <span className={m.rootLoginEnabled ? 'text-red-400' : 'text-emerald-400'}>{m.rootLoginEnabled ? 'habilitado' : 'desabilitado'}</span> · Firewall <span className={m.firewallEnabled ? 'text-emerald-400' : 'text-red-400'}>{m.firewallEnabled ? 'ativo' : 'inativo'}</span> · Porta SSH {m.sshPort}</p>
      </div>
    </div>
  )
}

function SessionsTab({ sessions }: { sessions: typeof import('../../lib/mockData').initialSessions }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {sessions.length === 0 && <p className="text-atlab-500 py-8 text-center text-sm">Nenhuma sessão registrada</p>}
      {sessions.map((s) => (
        <div key={s.id} className="bg-atlab-850 rounded-xl p-4 border border-atlab-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-atlab-500" />
              <span className="text-sm text-white font-mono">{s.user}@{s.fromIp}</span>
              {s.external && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">EXTERNO</span>}
            </div>
            <span className="text-xs text-atlab-400">
              {new Date(s.start).toLocaleString('pt-BR')} {s.end ? `→ ${new Date(s.end).toLocaleTimeString('pt-BR')}` : '(ativa)'}
            </span>
          </div>
          <div className="space-y-1 font-mono text-xs max-h-48 overflow-y-auto">
            {s.commands.map((c, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded ${c.suspicious ? 'bg-red-500/10 border border-red-500/20' : 'hover:bg-atlab-800'}`}>
                <span className="text-atlab-500 w-16 shrink-0">{new Date(c.ts).toLocaleTimeString('pt-BR')}</span>
                <span className={c.suspicious ? 'text-red-300' : 'text-atlab-200'}>{c.cmd}</span>
                {c.suspicious && <ShieldAlert className="w-3 h-3 text-red-400 shrink-0 ml-auto" />}
                {c.exitCode !== 0 && <span className="text-red-400 ml-auto">exit:{c.exitCode}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ExportTab({ m }: { m: Machine }) {
  const { toast } = useApp()
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast('success', `${label} copiado`))
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <p className="text-sm text-atlab-400">Exporte a conexão SSH para usar no Termius, Terminal ou qualquer cliente SSH.</p>

      <ExportBlock label="Comando SSH" code={sshCommand(m)} onCopy={(c) => copy(c, 'Comando SSH')} />
      <ExportBlock label="SSH URI (para Termius)" code={sshUri(m)} onCopy={(c) => copy(c, 'URI')} />
      <ExportBlock label="Bloco ~/.ssh/config" code={sshConfigBlock(m)} onCopy={(c) => copy(c, 'Config SSH')} />
      <ExportBlock label="JSON para Termius (importar host)" code={termiusJson(m)} onCopy={(c) => copy(c, 'JSON Termius')} />

      <div className="bg-atlab-850 rounded-lg p-4 border border-atlab-800">
        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2"><ExternalLink className="w-4 h-4 text-accent-400" /> Abrir em app externo</h4>
        <div className="flex gap-2">
          <a href={sshUri(m)} className="px-4 py-2 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm transition-colors">Abrir via SSH URI</a>
          <button onClick={() => copy(sshUri(m), 'URI')} className="px-4 py-2 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-atlab-300 text-sm">Copiar URI</button>
        </div>
      </div>
    </div>
  )
}

function ExportBlock({ label, code, onCopy }: { label: string; code: string; onCopy: (c: string) => void }) {
  return (
    <div className="bg-atlab-850 rounded-lg overflow-hidden border border-atlab-800">
      <div className="flex items-center justify-between px-4 py-2 border-b border-atlab-800">
        <span className="text-xs font-medium text-atlab-400 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> {label}</span>
        <button onClick={() => onCopy(code)} className="text-xs flex items-center gap-1 text-accent-400 hover:text-accent-300"><Copy className="w-3 h-3" /> Copiar</button>
      </div>
      <pre className="p-4 text-xs text-atlab-200 font-mono whitespace-pre-wrap overflow-x-auto">{code}</pre>
    </div>
  )
}


