import { useState } from 'react'
import { Play, FileCode, Server, Check, X, Loader2, Clock, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { useApp } from '../../store/AppContext'

interface Playbook {
  id: string
  name: string
  description: string
  category: string
  tasks: string[]
  yaml: string
}

interface TaskResult {
  task: string
  status: 'ok' | 'changed' | 'failed' | 'skipped' | 'running'
  host: string
  output?: string
}

interface RunResult {
  playbookId: string
  hosts: string[]
  startedAt: number
  finishedAt: number | null
  tasks: TaskResult[]
  status: 'running' | 'success' | 'failed'
}

const playbooks: Playbook[] = [
  {
    id: 'pb1', name: 'Hardening SSH', category: 'Segurança',
    description: 'Desabilita root login, força key-only, configura fail2ban',
    tasks: ['Desabilitar PermitRootLogin', 'Desabilitar PasswordAuth', 'Instalar fail2ban', 'Configurar regras fail2ban', 'Restart sshd'],
    yaml: `- name: SSH Hardening\n  hosts: "{{ target }}"\n  become: true\n  tasks:\n    - name: Disable root login\n      lineinfile:\n        path: /etc/ssh/sshd_config\n        regexp: '^PermitRootLogin'\n        line: 'PermitRootLogin no'\n    - name: Disable password auth\n      lineinfile:\n        path: /etc/ssh/sshd_config\n        regexp: '^PasswordAuthentication'\n        line: 'PasswordAuthentication no'\n    - name: Install fail2ban\n      apt: name=fail2ban state=present\n    - name: Enable fail2ban\n      service: name=fail2ban state=started enabled=yes\n    - name: Restart sshd\n      service: name=sshd state=restarted`,
  },
  {
    id: 'pb2', name: 'Atualizar Sistema', category: 'Manutenção',
    description: 'apt update + upgrade + autoremove + reboot se necessário',
    tasks: ['apt update', 'apt upgrade', 'apt autoremove', 'Verificar reboot pendente', 'Reboot (se necessário)'],
    yaml: `- name: Full System Update\n  hosts: "{{ target }}"\n  become: true\n  tasks:\n    - name: Update cache\n      apt: update_cache=yes\n    - name: Upgrade all\n      apt: upgrade=dist\n    - name: Autoremove\n      apt: autoremove=yes\n    - name: Check reboot\n      stat: path=/var/run/reboot-required\n      register: reboot_required\n    - name: Reboot if needed\n      reboot:\n      when: reboot_required.stat.exists`,
  },
  {
    id: 'pb3', name: 'Deploy Docker Stack', category: 'Deploy',
    description: 'Pull de imagens, docker compose down + up, healthcheck',
    tasks: ['Pull imagens', 'Parar containers', 'Subir containers', 'Healthcheck', 'Notificar sucesso'],
    yaml: `- name: Deploy Docker Stack\n  hosts: "{{ target }}"\n  become: true\n  tasks:\n    - name: Pull images\n      shell: docker compose pull\n      args:\n        chdir: /opt/app\n    - name: Stop containers\n      shell: docker compose down\n      args:\n        chdir: /opt/app\n    - name: Start containers\n      shell: docker compose up -d\n      args:\n        chdir: /opt/app\n    - name: Healthcheck\n      uri: url=http://localhost:8080/health\n      register: health\n      retries: 5\n      delay: 3\n    - name: Notify\n      debug: msg="Deploy OK"`,
  },
  {
    id: 'pb4', name: 'Configurar Firewall', category: 'Segurança',
    description: 'Instalar UFW, definir regras padrão, abrir SSH e HTTP',
    tasks: ['Instalar UFW', 'Definir default deny', 'Permitir SSH', 'Permitir HTTP/HTTPS', 'Ativar UFW'],
    yaml: `- name: Configure Firewall\n  hosts: "{{ target }}"\n  become: true\n  tasks:\n    - name: Install UFW\n      apt: name=ufw state=present\n    - name: Default deny incoming\n      ufw: direction=incoming default=deny\n    - name: Allow SSH\n      ufw: rule=allow port=22 proto=tcp\n    - name: Allow HTTP/HTTPS\n      ufw: rule=allow port={{ item }} proto=tcp\n      loop: [80, 443]\n    - name: Enable UFW\n      ufw: state=enabled`,
  },
  {
    id: 'pb5', name: 'Criar Usuário', category: 'Acesso',
    description: 'Cria usuário, configura SSH key e sudo opcional',
    tasks: ['Criar usuário', 'Criar diretório .ssh', 'Copiar authorized_keys', 'Configurar sudo', 'Verificar login'],
    yaml: `- name: Create User\n  hosts: "{{ target }}"\n  become: true\n  vars:\n    new_user: "{{ username }}"\n    ssh_key: "{{ pubkey }}"\n  tasks:\n    - name: Create user\n      user: name={{ new_user }} shell=/bin/bash\n    - name: Create .ssh dir\n      file: path=/home/{{ new_user }}/.ssh state=directory mode=0700 owner={{ new_user }}\n    - name: Set authorized key\n      authorized_key: user={{ new_user }} key={{ ssh_key }}\n    - name: Add to sudo\n      lineinfile: path=/etc/sudoers.d/{{ new_user }} line="{{ new_user }} ALL=(ALL) NOPASSWD:ALL" create=yes\n    - name: Verify\n      command: id {{ new_user }}`,
  },
]

export default function Playbooks() {
  const { machines, toast, logActivity } = useApp()
  const [selectedPb, setSelectedPb] = useState<Playbook | null>(null)
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set())
  const [showYaml, setShowYaml] = useState(false)
  const [runs, setRuns] = useState<RunResult[]>([])
  const [running, setRunning] = useState(false)

  const onlineMachines = machines.filter((m) => m.status !== 'offline')

  const toggleHost = (id: string) => {
    const next = new Set(selectedHosts)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedHosts(next)
  }

  const selectAll = () => setSelectedHosts(new Set(onlineMachines.map((m) => m.id)))
  const clearAll = () => setSelectedHosts(new Set())

  const execute = () => {
    if (!selectedPb || selectedHosts.size === 0) {
      toast('error', 'Selecione um playbook e pelo menos uma máquina')
      return
    }
    setRunning(true)
    const hosts = [...selectedHosts].map((id) => machines.find((m) => m.id === id)!.name)
    const run: RunResult = {
      playbookId: selectedPb.id,
      hosts,
      startedAt: Date.now(),
      finishedAt: null,
      tasks: [],
      status: 'running',
    }
    setRuns((r) => [run, ...r])
    toast('info', `Executando "${selectedPb.name}" em ${hosts.length} hosts...`)
    logActivity('Playbook executado', selectedPb.name, 'config')

    // Simulate task execution
    const totalTasks = selectedPb.tasks.length * hosts.length
    let completed = 0

    hosts.forEach((host) => {
      selectedPb.tasks.forEach((task, i) => {
        setTimeout(() => {
          completed++
          const status = Math.random() > 0.08 ? (Math.random() > 0.5 ? 'ok' : 'changed') : 'failed'
          const result: TaskResult = { task, status: status as TaskResult['status'], host }
          setRuns((rs) => rs.map((r, idx) => idx === 0 ? { ...r, tasks: [...r.tasks, result] } : r))

          if (completed === totalTasks) {
            const hasFailed = completed > 0 // check after all
            setTimeout(() => {
              setRuns((rs) => rs.map((r, idx) => idx === 0 ? {
                ...r,
                finishedAt: Date.now(),
                status: r.tasks.some((t) => t.status === 'failed') ? 'failed' : 'success',
              } : r))
              setRunning(false)
              const final = runs[0]?.tasks.some((t) => t.status === 'failed')
              toast(final ? 'warning' : 'success', `"${selectedPb!.name}" finalizado`)
            }, 300)
          }
        }, (i * hosts.indexOf(host) + i + 1) * 600 + Math.random() * 400)
      })
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileCode className="w-6 h-6 text-accent-400" /> Playbook Runner
        </h1>
        <p className="text-atlab-400 mt-1">Execute playbooks Ansible em máquinas do cluster</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playbook selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-atlab-300">Selecionar Playbook</h3>
          {playbooks.map((pb) => (
            <button key={pb.id} onClick={() => setSelectedPb(pb)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedPb?.id === pb.id ? 'border-accent-500 bg-accent-600/10' : 'border-atlab-800 bg-atlab-900 hover:border-atlab-700'}`}>
              <div className="flex items-center gap-2 mb-1">
                <FileCode className="w-4 h-4 text-accent-400" />
                <span className="font-medium text-white text-sm">{pb.name}</span>
              </div>
              <p className="text-xs text-atlab-400">{pb.description}</p>
              <span className="text-[10px] px-2 py-0.5 bg-atlab-800 rounded text-atlab-400 mt-2 inline-block">{pb.category}</span>
            </button>
          ))}
        </div>

        {/* Host selection + YAML */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-atlab-300">Máquinas alvo ({selectedHosts.size})</h3>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-accent-400 hover:text-accent-300">Todas</button>
              <button onClick={clearAll} className="text-xs text-atlab-400 hover:text-white">Limpar</button>
            </div>
          </div>
          <div className="bg-atlab-900 border border-atlab-800 rounded-xl max-h-64 overflow-y-auto divide-y divide-atlab-800/50">
            {onlineMachines.map((m) => (
              <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-atlab-850 cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedHosts.has(m.id)} onChange={() => toggleHost(m.id)}
                  className="w-4 h-4 rounded bg-atlab-800 border-atlab-600 accent-accent-500" />
                <Server className="w-4 h-4 text-atlab-500" />
                <span className="text-sm text-white flex-1">{m.name}</span>
                <span className="text-xs text-atlab-500 font-mono">{m.ip}</span>
              </label>
            ))}
          </div>

          {/* YAML preview */}
          {selectedPb && (
            <div className="bg-atlab-900 border border-atlab-800 rounded-xl overflow-hidden">
              <button onClick={() => setShowYaml(!showYaml)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-atlab-850 transition-colors">
                <span className="text-xs font-medium text-atlab-400">Visualizar YAML</span>
                {showYaml ? <ChevronDown className="w-4 h-4 text-atlab-500" /> : <ChevronRight className="w-4 h-4 text-atlab-500" />}
              </button>
              {showYaml && (
                <pre className="px-4 pb-4 text-xs text-atlab-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-60">{selectedPb.yaml}</pre>
              )}
            </div>
          )}

          <button onClick={execute} disabled={running || !selectedPb || selectedHosts.size === 0}
            className="w-full py-3 bg-accent-600 hover:bg-accent-500 disabled:opacity-40 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Executando...' : 'Executar Playbook'}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-atlab-300">Resultados</h3>
          {runs.length === 0 && <p className="text-sm text-atlab-500 text-center py-8">Nenhuma execução ainda</p>}
          {runs.map((run, ri) => {
            const pb = playbooks.find((p) => p.id === run.playbookId)!
            return (
              <div key={ri} className="bg-atlab-900 border border-atlab-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {run.status === 'running' && <Loader2 className="w-4 h-4 text-accent-400 animate-spin" />}
                    {run.status === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
                    {run.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm font-medium text-white">{pb.name}</span>
                  </div>
                  <span className="text-[10px] text-atlab-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {run.finishedAt ? `${((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s` : '...'}
                  </span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {run.tasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {t.status === 'ok' && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      {t.status === 'changed' && <Check className="w-3 h-3 text-yellow-400 shrink-0" />}
                      {t.status === 'failed' && <X className="w-3 h-3 text-red-400 shrink-0" />}
                      {t.status === 'running' && <Loader2 className="w-3 h-3 text-accent-400 animate-spin shrink-0" />}
                      <span className="text-atlab-300 truncate flex-1">{t.task}</span>
                      <span className="text-atlab-500 font-mono shrink-0">{t.host}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {run.hosts.map((h) => <span key={h} className="text-[10px] px-1.5 py-0.5 bg-atlab-800 rounded text-atlab-400 font-mono">{h}</span>)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
