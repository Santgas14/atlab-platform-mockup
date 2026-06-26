import { useState } from 'react'
import { Bell, AlertTriangle, XCircle, Info, Check, CheckCheck, Filter } from 'lucide-react'
import { useApp } from '../../store/AppContext'

const severityConfig = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Crítico' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Alerta' },
  info: { icon: Info, color: 'text-atlab-400', bg: 'bg-atlab-500/10', border: 'border-atlab-500/30', label: 'Info' },
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff}min atrás`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function Alerts() {
  const { alerts, ackAlert, ackAll } = useApp()
  const [showAck, setShowAck] = useState(true)

  const visible = alerts.filter((a) => showAck || !a.acknowledged)
  const unack = alerts.filter((a) => !a.acknowledged).length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-atlab-400" /> Central de Alertas
          </h1>
          <p className="text-atlab-400 mt-1">{unack} alertas não reconhecidos de {alerts.length} totais</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAck(!showAck)}
            className="flex items-center gap-2 px-4 py-2 bg-atlab-900 border border-atlab-700 rounded-lg text-atlab-300 text-sm hover:bg-atlab-800 transition-colors"
          >
            <Filter className="w-4 h-4" /> {showAck ? 'Ocultar reconhecidos' : 'Mostrar todos'}
          </button>
          {unack > 0 && (
            <button onClick={ackAll} className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm transition-colors">
              <CheckCheck className="w-4 h-4" /> Reconhecer todos
            </button>
          )}
        </div>
      </div>

      {/* severity summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(['critical', 'warning', 'info'] as const).map((sev) => {
          const c = severityConfig[sev]
          const count = alerts.filter((a) => a.severity === sev && !a.acknowledged).length
          const Icon = c.icon
          return (
            <div key={sev} className={`rounded-xl p-4 border ${c.border} ${c.bg} flex items-center gap-3`}>
              <Icon className={`w-6 h-6 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">{count}</p>
                <p className="text-xs text-atlab-400">{c.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        {visible.length === 0 && (
          <div className="text-center py-16 text-atlab-500">
            <CheckCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum alerta para exibir</p>
          </div>
        )}
        {visible.map((alert) => {
          const c = severityConfig[alert.severity]
          const Icon = c.icon
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                alert.acknowledged ? 'border-atlab-800 bg-atlab-900/50 opacity-60' : `${c.border} bg-atlab-900`
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{alert.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.color} uppercase font-medium`}>{c.label}</span>
                </div>
                <p className="text-sm text-atlab-400">{alert.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-atlab-500">
                  <span className="font-mono">{alert.source}</span>
                  <span>·</span>
                  <span>{timeAgo(alert.timestamp)}</span>
                </div>
              </div>
              {!alert.acknowledged ? (
                <button
                  onClick={() => ackAlert(alert.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-atlab-300 text-xs transition-colors shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> Reconhecer
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                  <Check className="w-3.5 h-3.5" /> ok
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
