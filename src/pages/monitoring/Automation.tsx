import {
  Workflow, Play, Database, Camera, HeartPulse, Trash2, Rocket,
  Clock, CheckCircle, XCircle, Loader2, Power,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { AutomationTask } from '../../lib/types'

const typeConfig: Record<AutomationTask['type'], { icon: typeof Workflow; color: string }> = {
  backup: { icon: Database, color: 'text-blue-400' },
  snapshot: { icon: Camera, color: 'text-purple-400' },
  healthcheck: { icon: HeartPulse, color: 'text-emerald-400' },
  cleanup: { icon: Trash2, color: 'text-amber-400' },
  deploy: { icon: Rocket, color: 'text-cyan-400' },
}

const statusConfig = {
  idle: { icon: Clock, color: 'text-atlab-400', iconClass: '', label: 'Aguardando' },
  running: { icon: Loader2, color: 'text-accent-400', iconClass: 'animate-spin', label: 'Executando' },
  success: { icon: CheckCircle, color: 'text-emerald-400', iconClass: '', label: 'Sucesso' },
  failed: { icon: XCircle, color: 'text-red-400', iconClass: '', label: 'Falhou' },
}

function relTime(ts: number) {
  if (ts === 0) return '—'
  const diff = ts - Date.now()
  const abs = Math.abs(diff)
  const m = Math.floor(abs / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  const str = d > 0 ? `${d}d` : h > 0 ? `${h}h` : `${m}min`
  return diff > 0 ? `em ${str}` : `há ${str}`
}

export default function Automation() {
  const { tasks, runTask, toggleTask } = useApp()

  const enabled = tasks.filter((t) => t.enabled).length
  const running = tasks.filter((t) => t.status === 'running').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Workflow className="w-6 h-6 text-atlab-400" /> Automações
        </h1>
        <p className="text-atlab-400 mt-1">{enabled} tarefas ativas · {running} em execução</p>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const tc = typeConfig[task.type]
          const sc = statusConfig[task.status]
          const TypeIcon = tc.icon
          const StatusIcon = sc.icon
          return (
            <div key={task.id} className={`bg-atlab-900 border rounded-xl p-5 transition-all ${task.enabled ? 'border-atlab-800' : 'border-atlab-800/50 opacity-60'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-atlab-800 rounded-xl flex items-center justify-center shrink-0">
                  <TypeIcon className={`w-6 h-6 ${tc.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{task.name}</h3>
                    <span className={`flex items-center gap-1 text-xs ${sc.color}`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${sc.iconClass}`} /> {sc.label}
                    </span>
                  </div>
                  <p className="text-sm text-atlab-400">{task.description}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-atlab-500">
                    <span className="font-mono px-1.5 py-0.5 bg-atlab-800 rounded">{task.schedule}</span>
                    <span>Última: {relTime(task.lastRun)}</span>
                    {task.nextRun > 0 && <span>Próxima: {relTime(task.nextRun)}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => runTask(task.id)}
                    disabled={task.status === 'running'}
                    className="flex items-center gap-1.5 px-3 py-2 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 rounded-lg text-white text-sm transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> Executar
                  </button>
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`p-2 rounded-lg transition-colors ${task.enabled ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-atlab-800 text-atlab-500 hover:bg-atlab-700'}`}
                    title={task.enabled ? 'Desativar' : 'Ativar'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
