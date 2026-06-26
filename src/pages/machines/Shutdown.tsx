import { useState } from 'react'
import {
  Power, AlertTriangle, Server, Check, Calendar, Clock, Loader2,
  Shield, ChevronDown, ChevronRight, Zap, Box,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { Machine } from '../../lib/types'

type ShutdownMode = 'immediate' | 'scheduled'

interface ScheduledShutdown {
  id: string
  machines: string[]
  scheduledFor: number
  reason: string
  createdAt: number
  status: 'pending' | 'executing' | 'completed' | 'cancelled'
}

export default function Shutdown() {
  const { machines, controlMachine, toast, logActivity } = useApp()
  const baremetals = machines.filter((m) => m.type === 'physical')
  const onlineBaremetals = baremetals.filter((m) => m.status !== 'offline')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<ShutdownMode>('immediate')
  const [reason, setReason] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [executing, setExecuting] = useState(false)
  const [shutdownLog, setShutdownLog] = useState<{ machine: string; status: 'pending' | 'shutting-down' | 'done' | 'failed' }[]>([])
  const [scheduledShutdowns, setScheduledShutdowns] = useState<ScheduledShutdown[]>([
    { id: 'ss1', machines: ['pve-node01', 'pve-node02', 'pve-node03'], scheduledFor: Date.now() + 1000 * 60 * 60 * 72, reason: 'Manutenção elétrica — andar 3', createdAt: Date.now() - 1000 * 60 * 60 * 2, status: 'pending' },
  ])

  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const selectAll = () => setSelected(new Set(onlineBaremetals.map((m) => m.id)))
  const clearAll = () => setSelected(new Set())

  const selectedMachines = baremetals.filter((m) => selected.has(m.id))
  const vmsAffected = machines.filter((m) => m.type !== 'physical' && selectedMachines.some((bm) => bm.node === m.node || bm.name === m.node))

  const CONFIRM_PHRASE = 'DESLIGAR INFRAESTRUTURA'

  const initiateShutdown = () => {
    if (selected.size === 0) { toast('error', 'Selecione ao menos um baremetal'); return }
    if (!reason.trim()) { toast('error', 'Informe o motivo do desligamento'); return }
    if (mode === 'scheduled' && (!scheduleDate || !scheduleTime)) { toast('error', 'Defina data e horário'); return }
    setConfirmOpen(true)
    setConfirmText('')
  }

  const executeShutdown = () => {
    if (mode === 'scheduled') {
      const ts = new Date(`${scheduleDate}T${scheduleTime}`).getTime()
      const entry: ScheduledShutdown = {
        id: `ss${Date.now()}`,
        machines: selectedMachines.map((m) => m.name),
        scheduledFor: ts,
        reason,
        createdAt: Date.now(),
        status: 'pending',
      }
      setScheduledShutdowns((s) => [entry, ...s])
      toast('success', `Desligamento agendado para ${new Date(ts).toLocaleString('pt-BR')}`)
      logActivity('Desligamento agendado', selectedMachines.map((m) => m.name).join(', '), 'config')
      setConfirmOpen(false)
      setSelected(new Set())
      setReason('')
      return
    }

    // Immediate shutdown sequence
    setExecuting(true)
    const log = selectedMachines.map((m) => ({ machine: m.name, status: 'pending' as const }))
    setShutdownLog(log)
    logActivity('Desligamento de emergência iniciado', `${selectedMachines.length} baremetals`, 'config')

    selectedMachines.forEach((m, i) => {
      setTimeout(() => {
        setShutdownLog((prev) => prev.map((l) => l.machine === m.name ? { ...l, status: 'shutting-down' } : l))
        toast('warning', `Desligando ${m.name}...`)
      }, i * 2000)

      setTimeout(() => {
        controlMachine(m.id, 'stop')
        setShutdownLog((prev) => prev.map((l) => l.machine === m.name ? { ...l, status: 'done' } : l))
      }, i * 2000 + 1500)
    })

    setTimeout(() => {
      setExecuting(false)
      toast('success', `${selectedMachines.length} baremetals desligados com segurança`)
      setConfirmOpen(false)
      setSelected(new Set())
    }, selectedMachines.length * 2000 + 2000)
  }

  const cancelScheduled = (id: string) => {
    setScheduledShutdowns((s) => s.map((x) => x.id === id ? { ...x, status: 'cancelled' } : x))
    toast('info', 'Desligamento agendado cancelado')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Power className="w-6 h-6 text-red-400" /> Desligamento Seguro
        </h1>
        <p className="text-atlab-400 mt-1">Desligamento controlado de máquinas baremetal para manutenção</p>
      </div>

      {/* Warning banner */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-300 font-medium">Atenção: operação irreversível sem acesso físico</p>
          <p className="text-xs text-red-400/80 mt-1">
            O desligamento de máquinas baremetal requer IPMI/iDRAC ou presença física para religá-las.
            Todas as VMs e containers hospedados nos nós selecionados serão desligados automaticamente antes do host.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-atlab-300">Selecionar Baremetals ({selected.size}/{onlineBaremetals.length})</h2>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-accent-400 hover:text-accent-300">Selecionar todos</button>
              <button onClick={clearAll} className="text-xs text-atlab-400 hover:text-white">Limpar</button>
            </div>
          </div>

          <div className="space-y-2">
            {baremetals.map((m) => {
              const isSelected = selected.has(m.id)
              const childVms = machines.filter((c) => c.type !== 'physical' && (c.node === m.name))
              const isOffline = m.status === 'offline'

              return (
                <div key={m.id} className={`bg-atlab-900 border rounded-xl p-4 transition-all ${isSelected ? 'border-red-500/50 bg-red-500/5' : 'border-atlab-800'} ${isOffline ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(m.id)}
                      disabled={isOffline}
                      className="w-5 h-5 rounded bg-atlab-800 border-atlab-600 accent-red-500"
                    />
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <Box className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{m.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.status === 'offline' ? 'bg-atlab-700 text-atlab-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {m.status === 'offline' ? 'offline' : 'online'}
                        </span>
                      </div>
                      <p className="text-xs text-atlab-400 mt-0.5">{m.ip} · {m.cores} cores · {m.ramGb}GB RAM</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-atlab-400">{childVms.length} VMs/CTs hospedados</p>
                      {childVms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 justify-end">
                          {childVms.slice(0, 3).map((v) => (
                            <span key={v.id} className="text-[10px] px-1.5 py-0.5 bg-atlab-800 rounded text-atlab-400 font-mono">{v.name}</span>
                          ))}
                          {childVms.length > 3 && <span className="text-[10px] text-atlab-500">+{childVms.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Config panel */}
        <div className="space-y-4">
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent-400" /> Configuração
            </h3>

            {/* Mode */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-atlab-400">Modo</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode('immediate')}
                  className={`p-3 rounded-lg border text-left transition-all ${mode === 'immediate' ? 'border-red-500/50 bg-red-500/10' : 'border-atlab-700 hover:border-atlab-600'}`}>
                  <Zap className={`w-4 h-4 mb-1 ${mode === 'immediate' ? 'text-red-400' : 'text-atlab-500'}`} />
                  <p className="text-xs font-medium text-white">Imediato</p>
                  <p className="text-[10px] text-atlab-400">Desliga agora</p>
                </button>
                <button onClick={() => setMode('scheduled')}
                  className={`p-3 rounded-lg border text-left transition-all ${mode === 'scheduled' ? 'border-accent-500/50 bg-accent-500/10' : 'border-atlab-700 hover:border-atlab-600'}`}>
                  <Calendar className={`w-4 h-4 mb-1 ${mode === 'scheduled' ? 'text-accent-400' : 'text-atlab-500'}`} />
                  <p className="text-xs font-medium text-white">Agendar</p>
                  <p className="text-[10px] text-atlab-400">Define horário</p>
                </button>
              </div>
            </div>

            {/* Schedule */}
            {mode === 'scheduled' && (
              <div className="space-y-3 mb-4 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-atlab-400">Data</label>
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-atlab-850 border border-atlab-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-atlab-400">Horário</label>
                  <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-atlab-850 border border-atlab-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-500" />
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="mb-4">
              <label className="text-xs font-medium text-atlab-400">Motivo</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Manutenção elétrica programada no andar 3"
                rows={3}
                className="w-full mt-1 px-3 py-2 bg-atlab-850 border border-atlab-700 rounded-lg text-white text-sm placeholder-atlab-500 focus:outline-none focus:border-accent-500 resize-none" />
            </div>

            {/* Impact summary */}
            {selected.size > 0 && (
              <div className="bg-atlab-850 rounded-lg p-3 mb-4 border border-atlab-800">
                <p className="text-xs font-medium text-atlab-300 mb-2">Impacto estimado:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-atlab-400">Baremetals</span><span className="text-white font-bold">{selected.size}</span></div>
                  <div className="flex justify-between"><span className="text-atlab-400">VMs/CTs afetados</span><span className="text-yellow-400 font-bold">{vmsAffected.length}</span></div>
                  <div className="flex justify-between"><span className="text-atlab-400">Modo</span><span className="text-white">{mode === 'immediate' ? 'Imediato' : 'Agendado'}</span></div>
                </div>
              </div>
            )}

            <button onClick={initiateShutdown} disabled={selected.size === 0 || executing}
              className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors">
              <Power className="w-4 h-4" />
              {mode === 'immediate' ? 'Iniciar Desligamento' : 'Agendar Desligamento'}
            </button>
          </div>

          {/* Execution log */}
          {shutdownLog.length > 0 && (
            <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-5 animate-fade-in">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-400" /> Progresso
              </h3>
              <div className="space-y-2">
                {shutdownLog.map((l) => (
                  <div key={l.machine} className="flex items-center gap-3">
                    {l.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-atlab-600" />}
                    {l.status === 'shutting-down' && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />}
                    {l.status === 'done' && <Check className="w-4 h-4 text-emerald-400" />}
                    {l.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    <span className={`text-sm font-mono ${l.status === 'done' ? 'text-atlab-400 line-through' : 'text-white'}`}>{l.machine}</span>
                    <span className="text-[10px] text-atlab-500 ml-auto">
                      {l.status === 'pending' ? 'aguardando' : l.status === 'shutting-down' ? 'desligando...' : l.status === 'done' ? 'offline' : 'erro'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scheduled shutdowns */}
      {scheduledShutdowns.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-atlab-300 uppercase tracking-wider mb-3">Desligamentos Agendados</h2>
          <div className="space-y-3">
            {scheduledShutdowns.map((ss) => (
              <div key={ss.id} className={`bg-atlab-900 border rounded-xl p-4 flex items-center gap-4 ${ss.status === 'cancelled' ? 'border-atlab-800 opacity-50' : 'border-atlab-800'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ss.status === 'pending' ? 'bg-yellow-500/10' : ss.status === 'completed' ? 'bg-emerald-500/10' : 'bg-atlab-800'}`}>
                  <Calendar className={`w-5 h-5 ${ss.status === 'pending' ? 'text-yellow-400' : ss.status === 'completed' ? 'text-emerald-400' : 'text-atlab-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{ss.reason}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-atlab-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ss.scheduledFor).toLocaleString('pt-BR')}</span>
                    <span>{ss.machines.length} baremetals: {ss.machines.join(', ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    ss.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                    ss.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    ss.status === 'executing' ? 'bg-red-500/10 text-red-400' :
                    'bg-atlab-700 text-atlab-400'
                  }`}>{ss.status === 'pending' ? 'pendente' : ss.status === 'completed' ? 'concluído' : ss.status === 'executing' ? 'executando' : 'cancelado'}</span>
                  {ss.status === 'pending' && (
                    <button onClick={() => cancelScheduled(ss.id)}
                      className="text-xs px-3 py-1.5 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-atlab-300 transition-colors">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => !executing && setConfirmOpen(false)}>
          <div className="w-full max-w-lg bg-atlab-900 border border-red-500/30 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <Power className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Confirmação de Desligamento</h2>
                  <p className="text-sm text-red-400">
                    {mode === 'immediate' ? 'Desligamento IMEDIATO' : `Agendado para ${scheduleDate} ${scheduleTime}`}
                  </p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-300 mb-2">Máquinas que serão desligadas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMachines.map((m) => (
                    <span key={m.id} className="text-xs px-2 py-1 bg-red-500/10 rounded text-red-300 font-mono">{m.name}</span>
                  ))}
                </div>
                {vmsAffected.length > 0 && (
                  <p className="text-xs text-yellow-400 mt-3">⚠️ {vmsAffected.length} VMs/Containers serão desligados automaticamente</p>
                )}
              </div>

              <div className="bg-atlab-850 rounded-lg p-3 mb-4">
                <p className="text-xs text-atlab-400 mb-1">Motivo:</p>
                <p className="text-sm text-white">{reason}</p>
              </div>

              {mode === 'immediate' && (
                <div className="mb-4">
                  <p className="text-xs text-atlab-400 mb-2">
                    Para confirmar, digite: <code className="text-red-400 bg-atlab-800 px-1.5 py-0.5 rounded font-mono font-bold">{CONFIRM_PHRASE}</code>
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    disabled={executing}
                    className="w-full px-4 py-3 bg-atlab-850 border border-atlab-700 rounded-lg text-white font-mono text-sm placeholder-atlab-600 focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-atlab-800">
              <button onClick={() => setConfirmOpen(false)} disabled={executing}
                className="px-5 py-2.5 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-atlab-300 text-sm transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button
                onClick={executeShutdown}
                disabled={(mode === 'immediate' && confirmText !== CONFIRM_PHRASE) || executing}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                {executing ? 'Desligando...' : mode === 'immediate' ? 'Desligar Agora' : 'Confirmar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
