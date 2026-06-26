import { useState } from 'react'
import { Shield, Lock, Unlock, AlertTriangle, Server, Check, Loader2, Clock, Zap, ShieldAlert } from 'lucide-react'
import { useApp } from '../../store/AppContext'

interface LockdownEvent {
  id: string
  action: 'engaged' | 'disengaged'
  by: string
  at: number
  reason: string
  machinesAffected: number
}

export default function Lockdown() {
  const { machines, toast, logActivity } = useApp()
  const [isLocked, setIsLocked] = useState(false)
  const [engaging, setEngaging] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'engage' | 'disengage'>('engage')
  const [confirmText, setConfirmText] = useState('')
  const [reason, setReason] = useState('')
  const [history, setHistory] = useState<LockdownEvent[]>([
    { id: 'le1', action: 'engaged', by: 'admin', at: Date.now() - 1000 * 60 * 60 * 24 * 15, reason: 'Atividade suspeita detectada em srv-web01', machinesAffected: 10 },
    { id: 'le2', action: 'disengaged', by: 'admin', at: Date.now() - 1000 * 60 * 60 * 24 * 15 + 1000 * 60 * 45, reason: 'Incidente resolvido, acesso restaurado', machinesAffected: 10 },
  ])

  const onlineMachines = machines.filter((m) => m.status !== 'offline')
  const ENGAGE_PHRASE = 'LOCKDOWN ATIVAR'
  const DISENGAGE_PHRASE = 'LOCKDOWN DESATIVAR'

  const openConfirm = (action: 'engage' | 'disengage') => {
    setConfirmAction(action)
    setConfirmText('')
    setConfirmOpen(true)
  }

  const execute = () => {
    setEngaging(true)
    setConfirmOpen(false)

    const action = confirmAction
    const label = action === 'engage' ? 'Lockdown ativado' : 'Lockdown desativado'

    setTimeout(() => {
      setIsLocked(action === 'engage')
      setEngaging(false)
      toast(action === 'engage' ? 'warning' : 'success', label)
      logActivity(label, `${onlineMachines.length} máquinas`, 'config')
      setHistory((h) => [{
        id: `le-${Date.now()}`,
        action: action === 'engage' ? 'engaged' : 'disengaged',
        by: 'admin',
        at: Date.now(),
        reason: reason || (action === 'engage' ? 'Lockdown manual de emergência' : 'Restauração de acesso'),
        machinesAffected: onlineMachines.length,
      }, ...h])
      setReason('')
    }, 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-400" /> Lockdown Mode
        </h1>
        <p className="text-atlab-400 mt-1">Bloqueio de emergência — restringe SSH em todas as máquinas</p>
      </div>

      {/* Status banner */}
      <div className={`rounded-xl p-6 mb-6 border ${isLocked ? 'bg-red-500/5 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isLocked ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
              {isLocked ? <Lock className="w-8 h-8 text-red-400" /> : <Unlock className="w-8 h-8 text-emerald-400" />}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isLocked ? 'text-red-400' : 'text-emerald-400'}`}>
                {isLocked ? 'LOCKDOWN ATIVO' : 'SISTEMA NORMAL'}
              </h2>
              <p className="text-atlab-400 mt-1">
                {isLocked
                  ? 'Apenas contas admin podem acessar SSH. Todos os outros acessos estão bloqueados.'
                  : 'Acesso SSH operando normalmente conforme políticas de grupo.'}
              </p>
            </div>
          </div>
          <div className={`w-4 h-4 rounded-full ${isLocked ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main control */}
        <div className="lg:col-span-2">
          {/* What lockdown does */}
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-white mb-4">O que o Lockdown faz:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Lock, text: 'Bloqueia SSH para todos exceto grupo Admin', color: 'text-red-400' },
                { icon: Shield, text: 'Revoga sessões SSH ativas de não-admins', color: 'text-red-400' },
                { icon: AlertTriangle, text: 'Envia alerta via WhatsApp/Telegram', color: 'text-yellow-400' },
                { icon: Server, text: 'Registra evento completo de auditoria', color: 'text-accent-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-atlab-850 rounded-lg p-3">
                  <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                  <span className="text-sm text-atlab-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Affected machines */}
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Máquinas afetadas ({onlineMachines.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {onlineMachines.map((m) => (
                <div key={m.id} className="flex items-center gap-2 bg-atlab-850 rounded-lg px-3 py-2">
                  <Server className="w-3.5 h-3.5 text-atlab-500" />
                  <span className="text-xs text-atlab-300 font-mono truncate">{m.name}</span>
                  {isLocked && <Lock className="w-3 h-3 text-red-400 ml-auto shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action panel */}
        <div className="space-y-4">
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" /> Ação
            </h3>

            <div className="mb-4">
              <label className="text-xs font-medium text-atlab-400 mb-1 block">Motivo</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder={isLocked ? 'Motivo para desativar lockdown...' : 'Motivo para ativar lockdown...'}
                rows={3}
                className="w-full px-3 py-2 bg-atlab-850 border border-atlab-700 rounded-lg text-white text-sm placeholder-atlab-500 focus:outline-none focus:border-accent-500 resize-none" />
            </div>

            {!isLocked ? (
              <button onClick={() => openConfirm('engage')} disabled={engaging}
                className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors">
                {engaging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {engaging ? 'Ativando...' : 'ATIVAR LOCKDOWN'}
              </button>
            ) : (
              <button onClick={() => openConfirm('disengage')} disabled={engaging}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors">
                {engaging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                {engaging ? 'Desativando...' : 'DESATIVAR LOCKDOWN'}
              </button>
            )}
          </div>

          {/* History */}
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-atlab-400" /> Histórico
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {history.map((e) => (
                <div key={e.id} className="border-l-2 pl-3" style={{ borderColor: e.action === 'engaged' ? '#f87171' : '#34d399' }}>
                  <div className="flex items-center gap-2">
                    {e.action === 'engaged' ? <Lock className="w-3 h-3 text-red-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                    <span className={`text-xs font-medium ${e.action === 'engaged' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {e.action === 'engaged' ? 'Lockdown ativado' : 'Lockdown desativado'}
                    </span>
                  </div>
                  <p className="text-xs text-atlab-400 mt-0.5">{e.reason}</p>
                  <p className="text-[10px] text-atlab-500 mt-0.5">
                    por {e.by} · {new Date(e.at).toLocaleString('pt-BR')} · {e.machinesAffected} máquinas
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-md bg-atlab-900 border border-red-500/30 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${confirmAction === 'engage' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                  {confirmAction === 'engage' ? <Lock className="w-6 h-6 text-red-400" /> : <Unlock className="w-6 h-6 text-emerald-400" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {confirmAction === 'engage' ? 'Ativar Lockdown?' : 'Desativar Lockdown?'}
                  </h2>
                  <p className="text-sm text-atlab-400">
                    {confirmAction === 'engage'
                      ? 'Todo acesso SSH não-admin será bloqueado imediatamente.'
                      : 'O acesso SSH será restaurado conforme políticas normais.'}
                  </p>
                </div>
              </div>

              {confirmAction === 'engage' && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-300">⚠️ {onlineMachines.length} máquinas serão bloqueadas. Sessões ativas de não-admins serão encerradas.</p>
                </div>
              )}

              <div>
                <p className="text-xs text-atlab-400 mb-2">
                  Digite: <code className="text-red-400 bg-atlab-800 px-1.5 py-0.5 rounded font-mono font-bold">
                    {confirmAction === 'engage' ? ENGAGE_PHRASE : DISENGAGE_PHRASE}
                  </code>
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmAction === 'engage' ? ENGAGE_PHRASE : DISENGAGE_PHRASE}
                  className="w-full px-4 py-3 bg-atlab-850 border border-atlab-700 rounded-lg text-white font-mono text-sm placeholder-atlab-600 focus:outline-none focus:border-red-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-atlab-800">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-atlab-300 text-sm">Cancelar</button>
              <button onClick={execute}
                disabled={confirmText !== (confirmAction === 'engage' ? ENGAGE_PHRASE : DISENGAGE_PHRASE)}
                className={`px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-40 ${confirmAction === 'engage' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                {confirmAction === 'engage' ? 'Ativar Lockdown' : 'Desativar Lockdown'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
