import { useEffect, useRef, useState } from 'react'
import { Terminal, Plus, X, Radio, Server, Search, Columns, Rows } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { Machine } from '../../lib/types'

interface TerminalPane {
  id: string
  machine: Machine
  lines: { text: string; type: 'system' | 'input' | 'output' | 'error' }[]
  connected: boolean
}

export default function MultiTerminal() {
  const { machines, logActivity, toast } = useApp()
  const [panes, setPanes] = useState<TerminalPane[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [broadcast, setBroadcast] = useState(false)
  const [broadcastInput, setBroadcastInput] = useState('')
  const [layout, setLayout] = useState<'cols' | 'rows'>('cols')
  const [search, setSearch] = useState('')

  const onlineMachines = machines.filter((m) => m.status !== 'offline')
  const filteredMachines = onlineMachines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.ip.includes(search)
  )

  const addPane = (m: Machine) => {
    if (panes.find((p) => p.machine.id === m.id)) { toast('info', `${m.name} já está aberto`); return }
    const pane: TerminalPane = { id: `pane-${Date.now()}`, machine: m, lines: [], connected: false }
    setPanes((p) => [...p, pane])
    setAddOpen(false)
    logActivity('Terminal multi-pane aberto', m.name, 'ssh')

    // Simulate connection
    setTimeout(() => {
      setPanes((ps) => ps.map((p) => p.id === pane.id ? {
        ...p,
        connected: true,
        lines: [
          { text: `Conectado a ${m.name} (${m.ip})`, type: 'system' },
          { text: `${m.os} ${m.osVersion} · ${m.cores} cores · ${m.ramGb}GB RAM`, type: 'output' },
          { text: '', type: 'output' },
        ],
      } : p))
    }, 800)
  }

  const removePane = (id: string) => setPanes((p) => p.filter((x) => x.id !== id))

  const executeInPane = (paneId: string, cmd: string) => {
    if (!cmd.trim()) return
    setPanes((ps) => ps.map((p) => {
      if (p.id !== paneId) return p
      const prompt = `admin@${p.machine.name}:~$`
      const output = simulateCommand(cmd, p.machine)
      return { ...p, lines: [...p.lines, { text: `${prompt} ${cmd}`, type: 'input' }, ...output] }
    }))
  }

  const executeBroadcast = () => {
    if (!broadcastInput.trim()) return
    panes.forEach((p) => {
      if (p.connected) executeInPane(p.id, broadcastInput)
    })
    setBroadcastInput('')
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-accent-400" /> Multi Terminal
          </h1>
          <p className="text-atlab-400 text-sm mt-0.5">{panes.length} sessões ativas · {broadcast ? 'modo broadcast ON' : 'modo individual'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLayout(layout === 'cols' ? 'rows' : 'cols')}
            className="p-2 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-atlab-300 transition-colors" title="Alternar layout">
            {layout === 'cols' ? <Columns className="w-4 h-4" /> : <Rows className="w-4 h-4" />}
          </button>
          <button onClick={() => setBroadcast(!broadcast)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${broadcast ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-atlab-800 text-atlab-300 border border-atlab-700'}`}>
            <Radio className="w-3.5 h-3.5" /> Broadcast
          </button>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>

      {/* Broadcast input bar */}
      {broadcast && (
        <div className="mb-3 flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2 animate-fade-in shrink-0">
          <Radio className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300 shrink-0">Broadcast:</span>
          <input
            value={broadcastInput}
            onChange={(e) => setBroadcastInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeBroadcast()}
            placeholder="Digitar aqui envia para TODOS os terminais..."
            className="flex-1 bg-transparent text-white text-sm placeholder-red-300/40 focus:outline-none font-mono"
          />
          <button onClick={executeBroadcast} className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300 transition-colors">Enter ↵</button>
        </div>
      )}

      {/* Panes grid */}
      {panes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Terminal className="w-16 h-16 text-atlab-700 mx-auto mb-4" />
            <p className="text-atlab-400 text-lg">Nenhum terminal aberto</p>
            <p className="text-atlab-500 text-sm mt-1">Clique "Adicionar" para conectar em máquinas</p>
            <button onClick={() => setAddOpen(true)} className="mt-4 px-4 py-2 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm transition-colors">
              <Plus className="w-4 h-4 inline mr-2" /> Adicionar terminal
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex-1 grid gap-2 overflow-hidden ${layout === 'cols'
          ? panes.length <= 2 ? 'grid-cols-2' : panes.length <= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-2'
          : panes.length <= 2 ? 'grid-rows-2' : 'grid-cols-2 grid-rows-2'
        }`}>
          {panes.map((pane) => (
            <PaneView key={pane.id} pane={pane} onRemove={() => removePane(pane.id)} onExecute={(cmd) => executeInPane(pane.id, cmd)} />
          ))}
        </div>
      )}

      {/* Add machine modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md bg-atlab-900 border border-atlab-700 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-atlab-800 flex items-center gap-3">
              <Search className="w-4 h-4 text-atlab-500" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar máquina..."
                className="flex-1 bg-transparent text-white placeholder-atlab-500 focus:outline-none text-sm" />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredMachines.map((m) => (
                <button key={m.id} onClick={() => addPane(m)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-atlab-800 transition-colors text-left">
                  <Server className="w-4 h-4 text-atlab-500" />
                  <span className="text-sm text-white flex-1">{m.name}</span>
                  <span className="text-xs text-atlab-500 font-mono">{m.ip}</span>
                  {panes.find((p) => p.machine.id === m.id) && <span className="text-[10px] text-accent-400">aberto</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PaneView({ pane, onRemove, onExecute }: { pane: TerminalPane; onRemove: () => void; onExecute: (cmd: string) => void }) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [pane.lines])

  const submit = () => { onExecute(input); setInput('') }
  const prompt = `admin@${pane.machine.name}:~$`

  return (
    <div className="bg-[#0a0e14] border border-atlab-800 rounded-lg flex flex-col overflow-hidden min-h-0">
      {/* title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-atlab-900 border-b border-atlab-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-atlab-300 font-mono ml-2">{pane.machine.name}</span>
          <span className="text-[10px] text-atlab-500">{pane.machine.ip}</span>
        </div>
        <button onClick={onRemove} className="text-atlab-500 hover:text-red-400 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed min-h-0">
        {pane.lines.map((l, i) => (
          <div key={i} className={
            l.type === 'system' ? 'text-atlab-500 italic' :
            l.type === 'input' ? 'text-white' :
            l.type === 'error' ? 'text-red-400' : 'text-emerald-300'
          }>{l.text || '\u00A0'}</div>
        ))}
        {pane.connected && (
          <div className="flex items-center text-white">
            <span className="text-emerald-400 mr-2 whitespace-nowrap">{prompt}</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="flex-1 bg-transparent focus:outline-none caret-emerald-400 min-w-0"
            />
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function simulateCommand(cmd: string, m: Machine): { text: string; type: 'output' | 'error' }[] {
  const [base] = cmd.trim().split(/\s+/)
  switch (base) {
    case 'uptime': return [{ text: ` up ${Math.floor(m.uptimeHours / 24)} days, load: 0.${Math.floor(m.cpu / 3)}`, type: 'output' }]
    case 'hostname': return [{ text: m.name, type: 'output' }]
    case 'whoami': return [{ text: 'admin', type: 'output' }]
    case 'df': return [{ text: `/ ${m.disk.toFixed(0)}% used of ${m.diskGb}GB`, type: 'output' }]
    case 'free': return [{ text: `Mem: ${m.ramGb}GB total, ${(m.ramGb * m.ram / 100).toFixed(1)}GB used`, type: 'output' }]
    case 'top': return [{ text: `CPU: ${m.cpu.toFixed(1)}% | RAM: ${m.ram.toFixed(1)}% | Tasks: 142`, type: 'output' }]
    case 'ip': return [{ text: `inet ${m.ip}/24`, type: 'output' }]
    case 'uname': return [{ text: `Linux ${m.name} ${m.kernel}`, type: 'output' }]
    case 'date': return [{ text: new Date().toLocaleString('pt-BR'), type: 'output' }]
    case 'clear': return []
    case 'ls': return [{ text: 'bin  etc  home  opt  root  tmp  usr  var', type: 'output' }]
    case 'ps': return [{ text: '  PID CMD\n 1042 nginx\n 2381 node\n 3101 postgres', type: 'output' }]
    case 'systemctl':
      return [{ text: '● nginx.service - active (running)\n● postgresql.service - active (running)', type: 'output' }]
    default:
      if (cmd.startsWith('echo')) return [{ text: cmd.replace(/^echo\s+/, '').replace(/['"]/g, ''), type: 'output' }]
      return [{ text: `${base}: command not found`, type: 'error' }]
  }
}
