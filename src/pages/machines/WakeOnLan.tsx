import { useState } from 'react'
import { Power, Wifi, Server, Check, Loader2, Clock, Box, AlertTriangle } from 'lucide-react'
import { useApp } from '../../store/AppContext'

interface WolHistory {
  id: string
  machine: string
  mac: string
  sentAt: number
  status: 'sent' | 'online' | 'timeout'
}

// Mock MACs for baremetals
const macAddresses: Record<string, string> = {
  'm1': 'AA:BB:CC:01:10:01',
  'm2': 'AA:BB:CC:01:11:02',
  'm3': 'AA:BB:CC:01:12:03',
}

export default function WakeOnLan() {
  const { machines, controlMachine, toast, logActivity } = useApp()
  const baremetals = machines.filter((m) => m.type === 'physical')
  const offlineBaremetals = baremetals.filter((m) => m.status === 'offline')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<WolHistory[]>([])
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const sendWol = () => {
    if (selected.size === 0) { toast('error', 'Selecione ao menos uma máquina'); return }

    if (scheduleMode) {
      if (!scheduleDate || !scheduleTime) { toast('error', 'Defina data e horário'); return }
      toast('success', `Wake-on-LAN agendado para ${scheduleDate} ${scheduleTime}`)
      logActivity('WoL agendado', [...selected].map((id) => machines.find((m) => m.id === id)!.name).join(', '), 'config')
      setSelected(new Set())
      return
    }

    setSending(true)
    const targets = [...selected].map((id) => machines.find((m) => m.id === id)!)

    targets.forEach((m, i) => {
      const mac = macAddresses[m.id] || 'FF:FF:FF:FF:FF:FF'
      const entry: WolHistory = { id: `wol-${Date.now()}-${i}`, machine: m.name, mac, sentAt: Date.now(), status: 'sent' }
      
      setTimeout(() => {
        setHistory((h) => [entry, ...h])
        toast('info', `Magic packet enviado para ${m.name} (${mac})`)
      }, i * 500)

      // Simulate machine coming online
      setTimeout(() => {
        controlMachine(m.id, 'start')
        setHistory((h) => h.map((x) => x.id === entry.id ? { ...x, status: 'online' } : x))
        toast('success', `${m.name} está online`)
      }, i * 500 + 3000 + Math.random() * 2000)
    })

    setTimeout(() => {
      setSending(false)
      logActivity('Wake-on-LAN enviado', targets.map((m) => m.name).join(', '), 'config')
      setSelected(new Set())
    }, targets.length * 500 + 1000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wifi className="w-6 h-6 text-emerald-400" /> Wake-on-LAN
        </h1>
        <p className="text-atlab-400 mt-1">Ligar máquinas baremetal remotamente via Magic Packet</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-atlab-300">Baremetals ({offlineBaremetals.length} offline)</h2>
          </div>

          {offlineBaremetals.length === 0 ? (
            <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-8 text-center">
              <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-atlab-300">Todos os baremetals estão online</p>
            </div>
          ) : (
            <div className="space-y-2">
              {baremetals.map((m) => {
                const isOffline = m.status === 'offline'
                const mac = macAddresses[m.id] || 'FF:FF:FF:FF:FF:FF'
                return (
                  <div key={m.id} className={`bg-atlab-900 border rounded-xl p-4 transition-all ${selected.has(m.id) ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-atlab-800'}`}>
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={() => toggle(m.id)}
                        disabled={!isOffline}
                        className="w-5 h-5 rounded bg-atlab-800 border-atlab-600 accent-emerald-500"
                      />
                      <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
                        <Box className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{m.name}</h3>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isOffline ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {isOffline ? 'offline' : 'online'}
                          </span>
                        </div>
                        <p className="text-xs text-atlab-400">{m.ip} · MAC: <span className="font-mono">{mac}</span></p>
                      </div>
                      {!isOffline && <span className="text-xs text-emerald-400">já ligado</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Control panel */}
        <div className="space-y-4">
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Power className="w-4 h-4 text-emerald-400" /> Controle
            </h3>

            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input type="checkbox" checked={scheduleMode} onChange={(e) => setScheduleMode(e.target.checked)}
                className="w-4 h-4 rounded bg-atlab-800 border-atlab-600 accent-accent-500" />
              <div>
                <span className="text-sm text-white">Agendar ligamento</span>
                <p className="text-[10px] text-atlab-500">Define data/hora para ligar automaticamente</p>
              </div>
            </label>

            {scheduleMode && (
              <div className="space-y-3 mb-4 animate-fade-in">
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-atlab-850 border border-atlab-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-500" />
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 bg-atlab-850 border border-atlab-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-500" />
              </div>
            )}

            <button onClick={sendWol} disabled={sending || selected.size === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              {sending ? 'Enviando...' : scheduleMode ? 'Agendar WoL' : `Enviar Magic Packet (${selected.size})`}
            </button>

            <div className="mt-3 bg-atlab-850 rounded-lg p-3 text-xs text-atlab-400">
              <p className="font-medium text-atlab-300 mb-1">Como funciona:</p>
              <p>O pacote mágico (UDP broadcast) é enviado para a NIC da máquina. A BIOS/UEFI precisa ter WoL habilitado.</p>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-atlab-400" /> Histórico
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs">
                    {h.status === 'sent' && <Loader2 className="w-3 h-3 text-yellow-400 animate-spin shrink-0" />}
                    {h.status === 'online' && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                    {h.status === 'timeout' && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                    <span className="text-atlab-300">{h.machine}</span>
                    <span className="text-atlab-500 font-mono ml-auto">{h.mac}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
