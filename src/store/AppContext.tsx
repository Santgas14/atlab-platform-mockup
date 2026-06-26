/**
 * AppContext.tsx — Estado global da aplicação ATLAB
 *
 * Gerencia:
 * - Lista de máquinas com métricas ao vivo (simulação a cada 2s)
 * - Nós Proxmox, alertas, atividades, tarefas, sessões SSH
 * - Sistema de toasts (notificações in-app)
 * - Controle de máquinas (ligar, desligar, reiniciar)
 * - Toggle de métricas ao vivo (pausar/retomar)
 *
 * Em produção: substituir simulação por WebSocket conectado ao backend.
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Machine, ProxmoxNode, Alert, ActivityEvent, AutomationTask, AuditSession } from '../lib/types'
import {
  initialMachines,
  initialNodes,
  initialAlerts,
  initialActivity,
  initialTasks,
  initialSessions,
} from '../lib/mockData'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

interface AppState {
  machines: Machine[]
  nodes: ProxmoxNode[]
  alerts: Alert[]
  activity: ActivityEvent[]
  tasks: AutomationTask[]
  sessions: AuditSession[]
  toasts: Toast[]
  live: boolean
  setLive: (v: boolean) => void
  toast: (type: Toast['type'], message: string) => void
  dismissToast: (id: string) => void
  ackAlert: (id: string) => void
  ackAll: () => void
  logActivity: (action: string, target: string, type: ActivityEvent['type']) => void
  runTask: (id: string) => void
  toggleTask: (id: string) => void
  controlMachine: (id: string, action: 'start' | 'stop' | 'reboot') => void
}

const AppContext = createContext<AppState | null>(null)

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const drift = (n: number, amt = 6) => clamp(n + (Math.random() - 0.5) * amt)

export function AppProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>(initialMachines)
  const [nodes, setNodes] = useState<ProxmoxNode[]>(initialNodes)
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [activity, setActivity] = useState<ActivityEvent[]>(initialActivity)
  const [tasks, setTasks] = useState<AutomationTask[]>(initialTasks)
  const [sessions] = useState<AuditSession[]>(initialSessions)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [live, setLive] = useState(true)
  const liveRef = useRef(live)
  liveRef.current = live

  const toast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  const dismissToast = (id: string) => setToasts((t) => t.filter((x) => x.id !== id))

  const ackAlert = (id: string) =>
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, acknowledged: true } : x)))

  const ackAll = () => {
    setAlerts((a) => a.map((x) => ({ ...x, acknowledged: true })))
    toast('success', 'Todos os alertas foram reconhecidos')
  }

  const logActivity = (action: string, target: string, type: ActivityEvent['type']) => {
    setActivity((a) => [
      { id: Math.random().toString(36).slice(2), action, target, user: 'admin', timestamp: Date.now(), type },
      ...a,
    ].slice(0, 50))
  }

  const runTask = (id: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: 'running' } : t)))
    const task = tasks.find((t) => t.id === id)
    if (task) {
      toast('info', `Executando: ${task.name}`)
      logActivity('Tarefa executada', task.name, 'config')
      setTimeout(() => {
        setTasks((ts) =>
          ts.map((t) => (t.id === id ? { ...t, status: 'success', lastRun: Date.now() } : t))
        )
        toast('success', `${task.name} concluída`)
      }, 2500)
    }
  }

  const toggleTask = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)))

  const controlMachine = (id: string, action: 'start' | 'stop' | 'reboot') => {
    const m = machines.find((x) => x.id === id)
    if (!m) return
    const labels = { start: 'iniciada', stop: 'desligada', reboot: 'reiniciada' }
    setMachines((ms) =>
      ms.map((x) => {
        if (x.id !== id) return x
        if (action === 'stop') return { ...x, status: 'offline', cpu: 0, ram: 0, netIn: 0, netOut: 0, uptimeHours: 0 }
        return { ...x, status: 'healthy', cpu: 8, ram: 20, uptimeHours: action === 'reboot' ? 0 : x.uptimeHours }
      })
    )
    toast(action === 'stop' ? 'warning' : 'success', `${m.name} ${labels[action]}`)
    logActivity(`Máquina ${labels[action]}`, m.name, 'config')
  }

  // Live metric simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!liveRef.current) return
      setMachines((ms) =>
        ms.map((m) => {
          if (m.status === 'offline') return m
          const cpu = drift(m.cpu)
          const ram = drift(m.ram, 3)
          const disk = clamp(m.disk + (Math.random() - 0.45) * 0.5)
          let status = m.status
          if (cpu > 90 || ram > 92) status = 'critical'
          else if (cpu > 80 || ram > 82) status = 'warning'
          else status = 'healthy'
          return {
            ...m,
            cpu,
            ram,
            disk,
            cpuTempC: Math.round(38 + cpu * 0.5 + (Math.random() - 0.5) * 4),
            netIn: Math.max(0, m.netIn + (Math.random() - 0.5) * 80),
            netOut: Math.max(0, m.netOut + (Math.random() - 0.5) * 80),
            netDownMbps: Math.max(0, Math.min(1000, m.netDownMbps + (Math.random() - 0.5) * 60)),
            netUpMbps: Math.max(0, Math.min(1000, m.netUpMbps + (Math.random() - 0.5) * 60)),
            status,
            history: [...m.history.slice(1), cpu],
          }
        })
      )
      setNodes((ns) =>
        ns.map((n) =>
          n.status === 'disconnected' ? n : { ...n, cpu: drift(n.cpu), ram: drift(n.ram, 3) }
        )
      )
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AppContext.Provider
      value={{
        machines, nodes, alerts, activity, tasks, sessions, toasts, live, setLive,
        toast, dismissToast, ackAlert, ackAll, logActivity, runTask, toggleTask, controlMachine,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
