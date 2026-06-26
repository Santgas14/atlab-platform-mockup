import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Server, Cpu, Activity, CheckCircle, AlertTriangle, XCircle, ArrowUpRight,
  ArrowDownRight, Zap, HardDrive, Boxes, TrendingUp,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import Gauge from '../../components/charts/Gauge'
import AreaChart from '../../components/charts/AreaChart'
import DonutChart from '../../components/charts/DonutChart'
import Sparkline from '../../components/charts/Sparkline'

export default function Dashboard() {
  const { machines, nodes, alerts } = useApp()

  const online = machines.filter((m) => m.status !== 'offline')
  const avgCpu = online.length ? online.reduce((s, m) => s + m.cpu, 0) / online.length : 0
  const avgRam = online.length ? online.reduce((s, m) => s + m.ram, 0) / online.length : 0
  const avgDisk = machines.reduce((s, m) => s + m.disk, 0) / machines.length
  const totalNetIn = online.reduce((s, m) => s + m.netIn, 0)
  const totalNetOut = online.reduce((s, m) => s + m.netOut, 0)

  const healthy = machines.filter((m) => m.status === 'healthy').length
  const warning = machines.filter((m) => m.status === 'warning').length
  const critical = machines.filter((m) => m.status === 'critical').length
  const offline = machines.filter((m) => m.status === 'offline').length

  const unackAlerts = alerts.filter((a) => !a.acknowledged).length
  const totalVms = nodes.reduce((s, n) => s + n.vms, 0)
  const totalCts = nodes.reduce((s, n) => s + n.containers, 0)

  // aggregate cpu/ram history from top machines
  const cpuSeries = useMemo(() => {
    const len = 30
    return Array.from({ length: len }, (_, i) => {
      const vals = online.map((m) => m.history[i] ?? 0)
      return vals.reduce((s, v) => s + v, 0) / (vals.length || 1)
    })
  }, [online])

  const ramSeries = useMemo(() => cpuSeries.map((v) => Math.min(100, v * 0.9 + 15)), [cpuSeries])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Operações</h1>
          <p className="text-atlab-400 mt-1">Infraestrutura ATLAB em tempo real</p>
        </div>
        {unackAlerts > 0 && (
          <Link to="/alerts" className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm hover:bg-red-500/20 transition-colors">
            <AlertTriangle className="w-4 h-4" />
            {unackAlerts} alertas ativos
          </Link>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Server} label="Máquinas Ativas" value={`${online.length}/${machines.length}`} trend={`${healthy} saudáveis`} trendUp color="text-atlab-400" />
        <KpiCard icon={Boxes} label="VMs / Containers" value={`${totalVms} / ${totalCts}`} trend="3 nós Proxmox" color="text-purple-400" />
        <KpiCard icon={ArrowDownRight} label="Tráfego Entrada" value={`${(totalNetIn / 1000).toFixed(2)} GB/s`} trend="rede agregada" trendUp color="text-emerald-400" />
        <KpiCard icon={ArrowUpRight} label="Tráfego Saída" value={`${(totalNetOut / 1000).toFixed(2)} GB/s`} trend="rede agregada" color="text-blue-400" />
      </div>

      {/* Gauges + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-atlab-400" />
            <h2 className="font-semibold text-white">Carga do Cluster</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Gauge value={avgCpu} label="CPU" sublabel="média" size={120} />
            <Gauge value={avgRam} label="RAM" sublabel="média" size={120} />
            <Gauge value={avgDisk} label="Disco" sublabel="total" size={120} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-atlab-900 border border-atlab-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-atlab-400" />
              <h2 className="font-semibold text-white">Utilização ao Vivo</h2>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> streaming
            </span>
          </div>
          <AreaChart
            series={[
              { data: cpuSeries, color: '#5490f5', label: 'CPU média (%)' },
              { data: ramSeries, color: '#a78bfa', label: 'RAM média (%)' },
            ]}
            height={200}
          />
        </div>
      </div>

      {/* Distribution + Top machines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Distribuição de Saúde</h2>
          <DonutChart
            centerValue={`${machines.length}`}
            centerLabel="total de máquinas"
            segments={[
              { label: 'Saudáveis', value: healthy, color: '#34d399' },
              { label: 'Alerta', value: warning, color: '#fbbf24' },
              { label: 'Crítico', value: critical, color: '#f87171' },
              { label: 'Offline', value: offline, color: '#475569' },
            ]}
          />
        </div>

        <div className="lg:col-span-2 bg-atlab-900 border border-atlab-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-atlab-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-atlab-400" />
            <h2 className="font-semibold text-white">Top Máquinas por Carga</h2>
          </div>
          <div className="divide-y divide-atlab-800/50">
            {[...machines]
              .filter((m) => m.status !== 'offline')
              .sort((a, b) => b.cpu - a.cpu)
              .slice(0, 5)
              .map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3 hover:bg-atlab-800/30 transition-colors">
                  <Server className="w-4 h-4 text-atlab-500 shrink-0" />
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium text-white truncate">{m.name}</p>
                    <p className="text-xs text-atlab-500">{m.ip}</p>
                  </div>
                  <div className="flex-1 max-w-[120px]">
                    <Sparkline data={m.history} color={m.cpu > 80 ? '#f87171' : m.cpu > 60 ? '#fbbf24' : '#34d399'} height={32} />
                  </div>
                  <div className="flex items-center gap-1 w-16 justify-end">
                    <Cpu className="w-3 h-3 text-atlab-500" />
                    <span className={`text-sm font-mono tabular-nums ${m.cpu > 80 ? 'text-red-400' : 'text-white'}`}>{m.cpu.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1 w-16 justify-end">
                    <HardDrive className="w-3 h-3 text-atlab-500" />
                    <span className="text-sm font-mono tabular-nums text-atlab-300">{m.ram.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Status legend bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusPill icon={CheckCircle} label="Saudáveis" count={healthy} color="emerald" />
        <StatusPill icon={AlertTriangle} label="Em Alerta" count={warning} color="yellow" />
        <StatusPill icon={XCircle} label="Críticos" count={critical} color="red" />
        <StatusPill icon={Server} label="Offline" count={offline} color="slate" />
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, trend, trendUp, color }: {
  icon: typeof Server; label: string; value: string; trend: string; trendUp?: boolean; color: string
}) {
  return (
    <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-5 hover:border-atlab-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-atlab-400 text-sm">{label}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-atlab-500'}`}>
        {trend}
      </p>
    </div>
  )
}

function StatusPill({ icon: Icon, label, count, color }: {
  icon: typeof Server; label: string; count: number; color: string
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-400/10 text-emerald-400',
    yellow: 'bg-yellow-400/10 text-yellow-400',
    red: 'bg-red-400/10 text-red-400',
    slate: 'bg-slate-400/10 text-slate-400',
  }
  return (
    <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{count}</p>
        <p className="text-xs text-atlab-400">{label}</p>
      </div>
    </div>
  )
}
