/**
 * SSHTerminal.tsx — Terminal SSH avançado do ATLAB
 *
 * Features:
 * - Copiar ao selecionar texto (auto-copy)
 * - Colar com botão direito do mouse
 * - Ctrl+C para cancelar comando, Ctrl+L para limpar
 * - Histórico de comandos navegável (↑↓)
 * - Autocomplete básico com Tab
 * - Redimensionável (arrastar borda inferior)
 * - Barra de status com uso de CPU/RAM ao vivo
 * - Busca no terminal (Ctrl+F)
 * - Contador de linhas e tempo de sessão
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Terminal as TerminalIcon, Circle, Copy, Search, Maximize2, Minimize2, Clock } from 'lucide-react'
import type { Machine } from '../../lib/types'

interface Line {
  text: string
  type: 'system' | 'input' | 'output' | 'error' | 'success'
  ts: number
}

const COMMANDS = ['ls', 'cd', 'pwd', 'cat', 'whoami', 'uptime', 'free', 'df', 'top', 'htop', 'ps', 'ping', 'neofetch', 'clear', 'exit', 'help', 'systemctl', 'docker', 'journalctl', 'tail', 'grep', 'find', 'chmod', 'chown', 'mkdir', 'rm', 'cp', 'mv', 'nano', 'vim', 'ip', 'ss', 'netstat', 'curl', 'wget']

const fakeFs: Record<string, string[]> = {
  '/': ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv', 'sys', 'tmp', 'usr', 'var'],
  '/etc': ['nginx/', 'ssh/', 'systemd/', 'hosts', 'passwd', 'shadow', 'fstab', 'resolv.conf', 'crontab'],
  '/var': ['log/', 'lib/', 'www/', 'cache/', 'tmp/', 'spool/'],
  '/var/log': ['syslog', 'auth.log', 'kern.log', 'nginx/', 'fail2ban.log'],
  '/home': ['admin/', 'deploy/', 'dev/'],
  '/opt': ['app/', 'docker/', 'scripts/'],
}

export default function SSHTerminal({ machine, onClose }: { machine: Machine; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState('~')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [connected, setConnected] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMaximized, setIsMaximized] = useState(false)
  const [sessionStart] = useState(Date.now())
  const [copied, setCopied] = useState(false)
  const [tabSuggestion, setTabSuggestion] = useState('')

  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // ─── Connection animation ──────────────────────────────────────
  useEffect(() => {
    const steps: Line[] = [
      { text: `Conectando a ${machine.name} (${machine.ip})...`, type: 'system', ts: Date.now() },
      { text: `Negociando protocolo SSH-2.0...`, type: 'system', ts: Date.now() },
      { text: `Autenticando com chave pública ED25519...`, type: 'system', ts: Date.now() },
      { text: `Autenticação aceita. Canal aberto.`, type: 'success', ts: Date.now() },
    ]
    steps.forEach((l, i) => setTimeout(() => setLines((p) => [...p, l]), i * 350))
    setTimeout(() => {
      setConnected(true)
      setLines((p) => [
        ...p,
        { text: '', type: 'output', ts: Date.now() },
        { text: `┌─────────────────────────────────────────────┐`, type: 'output', ts: Date.now() },
        { text: `│  Welcome to ${machine.os} ${machine.osVersion}`.padEnd(46) + '│', type: 'output', ts: Date.now() },
        { text: `│  Hostname: ${machine.name}`.padEnd(46) + '│', type: 'output', ts: Date.now() },
        { text: `│  Uptime: ${Math.floor(machine.uptimeHours / 24)} days ${machine.uptimeHours % 24}h`.padEnd(46) + '│', type: 'output', ts: Date.now() },
        { text: `│  CPU: ${machine.cores} cores │ RAM: ${machine.ramGb}GB │ Disk: ${machine.diskGb}GB`.padEnd(46) + '│', type: 'output', ts: Date.now() },
        { text: `│  Kernel: ${machine.kernel}`.padEnd(46) + '│', type: 'output', ts: Date.now() },
        { text: `└─────────────────────────────────────────────┘`, type: 'output', ts: Date.now() },
        { text: '', type: 'output', ts: Date.now() },
        { text: `Last login: ${new Date().toLocaleString('pt-BR')} from 10.0.0.1`, type: 'system', ts: Date.now() },
        { text: '', type: 'output', ts: Date.now() },
      ])
    }, steps.length * 350 + 200)
  }, [machine])

  // ─── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  // ─── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); setSearchOpen((s) => !s) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ─── Auto-copy on selection ────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()?.toString()
    if (selection && selection.length > 0) {
      navigator.clipboard.writeText(selection).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    }
  }, [])

  // ─── Right-click paste ─────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    navigator.clipboard.readText().then((text) => {
      if (text) {
        setInput((prev) => prev + text)
        inputRef.current?.focus()
      }
    }).catch(() => {})
  }, [])

  const prompt = `${machine.name.split('-')[0] === 'root' ? 'root' : 'admin'}@${machine.name}:${cwd}$`

  // ─── Command execution ─────────────────────────────────────────
  const exec = (cmd: string) => {
    const out: Line[] = [{ text: `${prompt} ${cmd}`, type: 'input', ts: Date.now() }]
    const [base, ...args] = cmd.trim().split(/\s+/)
    const arg = args.join(' ')

    switch (base) {
      case '': break
      case 'help':
        out.push({ text: '╭─ Comandos disponíveis ────────────────────────╮', type: 'output', ts: Date.now() })
        out.push({ text: '│ Navegação:  ls, cd, pwd, find                  │', type: 'output', ts: Date.now() })
        out.push({ text: '│ Sistema:    whoami, uptime, free, df, top, ps   │', type: 'output', ts: Date.now() })
        out.push({ text: '│ Rede:       ip, ss, ping, curl, netstat         │', type: 'output', ts: Date.now() })
        out.push({ text: '│ Serviços:   systemctl, docker, journalctl       │', type: 'output', ts: Date.now() })
        out.push({ text: '│ Arquivos:   cat, tail, grep, chmod, mkdir, rm   │', type: 'output', ts: Date.now() })
        out.push({ text: '│ Outros:     neofetch, clear, exit               │', type: 'output', ts: Date.now() })
        out.push({ text: '╰───────────────────────────────────────────────╯', type: 'output', ts: Date.now() })
        out.push({ text: '', type: 'output', ts: Date.now() })
        out.push({ text: '  Atalhos: Ctrl+L limpar | Ctrl+C cancelar | Tab completar', type: 'system', ts: Date.now() })
        out.push({ text: '  Mouse: selecionar = copiar | botão direito = colar', type: 'system', ts: Date.now() })
        break
      case 'ls': {
        const dir = arg || (cwd === '~' ? '/' : cwd)
        const files = fakeFs[dir] || ['arquivo.txt', 'config.yml', 'README.md', '.env', 'docker-compose.yml']
        const formatted = files.map((f) => f.endsWith('/') ? `\x1b[34m${f}\x1b[0m` : f)
        out.push({ text: formatted.join('  '), type: 'output', ts: Date.now() })
        break
      }
      case 'cd':
        if (!arg || arg === '~' || arg === '/') setCwd(arg || '~')
        else if (arg === '..') setCwd((prev) => prev === '~' ? '~' : prev.split('/').slice(0, -1).join('/') || '/')
        else setCwd(arg.startsWith('/') ? arg : `${cwd === '~' ? '' : cwd}/${arg}`)
        break
      case 'pwd':
        out.push({ text: cwd === '~' ? '/root' : cwd, type: 'output', ts: Date.now() })
        break
      case 'whoami':
        out.push({ text: 'admin', type: 'output', ts: Date.now() })
        break
      case 'hostname':
        out.push({ text: machine.name, type: 'output', ts: Date.now() })
        break
      case 'uptime':
        out.push({ text: ` ${new Date().toLocaleTimeString('pt-BR')} up ${Math.floor(machine.uptimeHours / 24)} days, ${machine.uptimeHours % 24}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}, load average: ${(machine.cpu / 25).toFixed(2)}, ${(machine.cpu / 30).toFixed(2)}, ${(machine.cpu / 35).toFixed(2)}`, type: 'output', ts: Date.now() })
        break
      case 'free':
        const usedMb = Math.floor(machine.ramGb * 1024 * machine.ram / 100)
        const totalMb = machine.ramGb * 1024
        out.push({ text: '               total        used        free      shared  buff/cache   available', type: 'output', ts: Date.now() })
        out.push({ text: `Mem:       ${totalMb.toString().padStart(8)}    ${usedMb.toString().padStart(8)}    ${(totalMb - usedMb).toString().padStart(8)}        256       ${Math.floor(totalMb * 0.2).toString().padStart(5)}    ${Math.floor(totalMb * 0.6).toString().padStart(8)}`, type: 'output', ts: Date.now() })
        out.push({ text: `Swap:          4096         128        3968`, type: 'output', ts: Date.now() })
        break
      case 'df':
        out.push({ text: 'Filesystem      Size  Used Avail Use% Mounted on', type: 'output', ts: Date.now() })
        machine.disks.forEach((d) => {
          out.push({ text: `${d.device.padEnd(16)}${d.sizeGb}G  ${Math.floor(d.sizeGb * d.usedPct / 100)}G   ${Math.floor(d.sizeGb * (100 - d.usedPct) / 100)}G  ${d.usedPct}%  ${d.mount}`, type: 'output', ts: Date.now() })
        })
        break
      case 'top':
      case 'htop':
        out.push({ text: `top - ${new Date().toLocaleTimeString('pt-BR')} up ${Math.floor(machine.uptimeHours / 24)} days`, type: 'output', ts: Date.now() })
        out.push({ text: `Tasks: 187 total, 3 running, 184 sleeping, 0 stopped`, type: 'output', ts: Date.now() })
        out.push({ text: `%Cpu(s): ${machine.cpu.toFixed(1)} us, 2.1 sy, 0.0 ni, ${(100 - machine.cpu - 2.1).toFixed(1)} id`, type: 'output', ts: Date.now() })
        out.push({ text: `MiB Mem: ${machine.ramGb * 1024} total, ${Math.floor(machine.ramGb * 1024 * (100 - machine.ram) / 100)} free, ${Math.floor(machine.ramGb * 1024 * machine.ram / 100)} used`, type: 'output', ts: Date.now() })
        out.push({ text: '', type: 'output', ts: Date.now() })
        out.push({ text: '  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM  COMMAND', type: 'output', ts: Date.now() })
        out.push({ text: ' 1042 root      20   0  512384  28416  12288 S  12.3   4.5  nginx', type: 'output', ts: Date.now() })
        out.push({ text: ' 2381 root      20   0  894720  65536  18432 S   8.1   2.1  node', type: 'output', ts: Date.now() })
        out.push({ text: ' 3401 postgres  20   0  256128  42880  16384 S   5.2   3.8  postgres', type: 'output', ts: Date.now() })
        out.push({ text: ' 4122 root      20   0   85760  12544   8192 S   2.0   0.8  sshd', type: 'output', ts: Date.now() })
        break
      case 'ps':
        out.push({ text: '  PID TTY          TIME CMD', type: 'output', ts: Date.now() })
        out.push({ text: ' 1042 ?        00:04:21 nginx: master', type: 'output', ts: Date.now() })
        out.push({ text: ' 2381 ?        00:12:09 node /opt/app/server.js', type: 'output', ts: Date.now() })
        out.push({ text: ' 3401 ?        00:08:45 /usr/lib/postgresql/16/bin/postgres', type: 'output', ts: Date.now() })
        out.push({ text: ' 4122 ?        00:00:01 sshd: admin@pts/0', type: 'output', ts: Date.now() })
        break
      case 'ip':
        out.push({ text: `1: lo    inet 127.0.0.1/8 scope host lo`, type: 'output', ts: Date.now() })
        out.push({ text: `2: eth0  inet ${machine.ip}/24 brd ${machine.ip.split('.').slice(0, 3).join('.')}.255 scope global eth0`, type: 'output', ts: Date.now() })
        break
      case 'ss':
      case 'netstat':
        out.push({ text: 'State    Recv-Q  Send-Q  Local Address:Port  Peer Address:Port', type: 'output', ts: Date.now() })
        out.push({ text: `LISTEN   0       128     0.0.0.0:${machine.sshPort}         0.0.0.0:*`, type: 'output', ts: Date.now() })
        out.push({ text: `LISTEN   0       511     0.0.0.0:80           0.0.0.0:*`, type: 'output', ts: Date.now() })
        out.push({ text: `LISTEN   0       511     0.0.0.0:443          0.0.0.0:*`, type: 'output', ts: Date.now() })
        out.push({ text: `ESTAB    0       0       ${machine.ip}:${machine.sshPort}   10.0.0.5:52341`, type: 'output', ts: Date.now() })
        break
      case 'ping':
        const target = arg || '10.0.0.1'
        out.push({ text: `PING ${target} (${target}) 56(84) bytes of data.`, type: 'output', ts: Date.now() })
        for (let i = 0; i < 3; i++) {
          out.push({ text: `64 bytes from ${target}: icmp_seq=${i + 1} ttl=64 time=0.${Math.floor(100 + Math.random() * 800)}ms`, type: 'output', ts: Date.now() })
        }
        out.push({ text: `--- ${target} ping statistics ---`, type: 'output', ts: Date.now() })
        out.push({ text: `3 packets transmitted, 3 received, 0% packet loss`, type: 'success', ts: Date.now() })
        break
      case 'systemctl':
        if (arg.startsWith('status')) {
          const svc = args[1] || 'nginx'
          out.push({ text: `● ${svc}.service - ${svc} service`, type: 'success', ts: Date.now() })
          out.push({ text: `     Loaded: loaded (/lib/systemd/system/${svc}.service; enabled)`, type: 'output', ts: Date.now() })
          out.push({ text: `     Active: active (running) since ${new Date(Date.now() - machine.uptimeHours * 3600000).toLocaleDateString('pt-BR')}`, type: 'success', ts: Date.now() })
          out.push({ text: `   Main PID: 1042 (${svc})`, type: 'output', ts: Date.now() })
        } else {
          out.push({ text: 'nginx.service          active  running', type: 'output', ts: Date.now() })
          out.push({ text: 'postgresql.service      active  running', type: 'output', ts: Date.now() })
          out.push({ text: 'sshd.service           active  running', type: 'output', ts: Date.now() })
          out.push({ text: 'docker.service         active  running', type: 'output', ts: Date.now() })
          out.push({ text: 'fail2ban.service       active  running', type: 'output', ts: Date.now() })
        }
        break
      case 'docker':
        if (arg === 'ps') {
          out.push({ text: 'CONTAINER ID   IMAGE              STATUS         PORTS                  NAMES', type: 'output', ts: Date.now() })
          out.push({ text: 'a1b2c3d4e5f6   nginx:alpine       Up 12 days     0.0.0.0:80->80/tcp     proxy', type: 'output', ts: Date.now() })
          out.push({ text: 'f6e5d4c3b2a1   postgres:16        Up 12 days     5432/tcp               db', type: 'output', ts: Date.now() })
          out.push({ text: '1a2b3c4d5e6f   redis:alpine       Up 12 days     6379/tcp               cache', type: 'output', ts: Date.now() })
        } else {
          out.push({ text: `Usage: docker [ps|images|logs|stats]`, type: 'output', ts: Date.now() })
        }
        break
      case 'cat':
        if (arg === '/etc/hosts') {
          out.push({ text: '127.0.0.1       localhost', type: 'output', ts: Date.now() })
          out.push({ text: `${machine.ip}    ${machine.name}`, type: 'output', ts: Date.now() })
          out.push({ text: '::1             localhost ip6-localhost', type: 'output', ts: Date.now() })
        } else if (arg === '/etc/os-release') {
          out.push({ text: `NAME="${machine.os}"`, type: 'output', ts: Date.now() })
          out.push({ text: `VERSION="${machine.osVersion}"`, type: 'output', ts: Date.now() })
          out.push({ text: `ID=${machine.os.toLowerCase()}`, type: 'output', ts: Date.now() })
        } else {
          out.push({ text: `cat: ${arg || '(nenhum arquivo)'}: use cat /etc/hosts ou /etc/os-release`, type: 'error', ts: Date.now() })
        }
        break
      case 'neofetch':
        out.push({ text: `       _nnnn_          ${machine.name}`, type: 'output', ts: Date.now() })
        out.push({ text: `      dGGGGMMb         ─────────────────────`, type: 'output', ts: Date.now() })
        out.push({ text: `     @p~qp~~qMb        OS: ${machine.os} ${machine.osVersion}`, type: 'output', ts: Date.now() })
        out.push({ text: `     M|@||@) M|        Kernel: ${machine.kernel}`, type: 'output', ts: Date.now() })
        out.push({ text: `     @,----.JM|        CPU: ${machine.cores} cores (${machine.cpu.toFixed(0)}% usage)`, type: 'output', ts: Date.now() })
        out.push({ text: `    JS^\\__/  qKL       Memory: ${Math.floor(machine.ramGb * machine.ram / 100)}GB / ${machine.ramGb}GB (${machine.ram.toFixed(0)}%)`, type: 'output', ts: Date.now() })
        out.push({ text: `   dZP        qKRb     Disk: ${machine.diskGb}GB (${machine.disk.toFixed(0)}% used)`, type: 'output', ts: Date.now() })
        out.push({ text: `  dZP          qKKb    Uptime: ${Math.floor(machine.uptimeHours / 24)} days`, type: 'output', ts: Date.now() })
        out.push({ text: `  fZP            SMMb  IP: ${machine.ip}`, type: 'output', ts: Date.now() })
        if (machine.gpu) {
          out.push({ text: `  HZM            MMMM  GPU: ${machine.gpu.model}`, type: 'output', ts: Date.now() })
        }
        out.push({ text: `  FqM            MMMM  Temp: ${machine.cpuTempC}°C`, type: 'output', ts: Date.now() })
        break
      case 'curl':
        out.push({ text: '{"status":"healthy","version":"2.4.1","uptime":' + machine.uptimeHours * 3600 + '}', type: 'output', ts: Date.now() })
        break
      case 'journalctl':
        out.push({ text: `-- Logs begin at ${new Date(Date.now() - 86400000 * 30).toLocaleDateString('pt-BR')} --`, type: 'system', ts: Date.now() })
        out.push({ text: `Jun 26 12:00:01 ${machine.name} systemd[1]: Started Daily apt activities.`, type: 'output', ts: Date.now() })
        out.push({ text: `Jun 26 12:00:02 ${machine.name} sshd[4122]: Accepted publickey for admin from 10.0.0.5`, type: 'output', ts: Date.now() })
        out.push({ text: `Jun 26 12:01:15 ${machine.name} nginx[1042]: 10.0.0.5 GET /api/health 200 12ms`, type: 'output', ts: Date.now() })
        break
      case 'tail':
        out.push({ text: `==> /var/log/syslog <==`, type: 'system', ts: Date.now() })
        out.push({ text: `Jun 26 12:32:01 ${machine.name} CRON[5001]: (root) CMD (test -x /etc/cron.daily)`, type: 'output', ts: Date.now() })
        out.push({ text: `Jun 26 12:32:15 ${machine.name} kernel: [684421.12] eth0: link up`, type: 'output', ts: Date.now() })
        break
      case 'find':
        out.push({ text: `/opt/app/server.js`, type: 'output', ts: Date.now() })
        out.push({ text: `/opt/app/package.json`, type: 'output', ts: Date.now() })
        out.push({ text: `/opt/app/docker-compose.yml`, type: 'output', ts: Date.now() })
        break
      case 'clear':
        setLines([])
        return
      case 'exit':
        setLines((p) => [...p, { text: '', type: 'output', ts: Date.now() }, { text: 'Conexão encerrada.', type: 'system', ts: Date.now() }])
        setTimeout(onClose, 700)
        return
      default:
        out.push({ text: `-bash: ${base}: comando não encontrado`, type: 'error', ts: Date.now() })
        out.push({ text: `  dica: digite 'help' para ver comandos disponíveis`, type: 'system', ts: Date.now() })
    }
    setLines((p) => [...p, ...out])
  }

  const submit = () => {
    if (!connected) return
    exec(input)
    if (input.trim()) setHistory((h) => [input, ...h].slice(0, 100))
    setInput('')
    setHistIdx(-1)
    setTabSuggestion('')
  }

  // ─── Advanced autocomplete ──────────────────────────────────────
  const [ghost, setGhost] = useState('')  // fish-style inline suggestion

  // Subcommands for common tools
  const subcommands: Record<string, string[]> = {
    systemctl: ['status', 'start', 'stop', 'restart', 'enable', 'disable', 'list-units', 'daemon-reload'],
    docker: ['ps', 'images', 'logs', 'stats', 'exec', 'compose', 'pull', 'build', 'stop', 'rm'],
    apt: ['update', 'upgrade', 'install', 'remove', 'autoremove', 'search', 'list'],
    git: ['status', 'log', 'pull', 'push', 'commit', 'branch', 'checkout', 'clone', 'diff'],
    journalctl: ['-u', '-f', '--since', '-n', '--no-pager'],
    tail: ['-f', '-n', '/var/log/syslog', '/var/log/auth.log', '/var/log/nginx/access.log'],
    cat: ['/etc/hosts', '/etc/os-release', '/etc/passwd', '/etc/ssh/sshd_config'],
    cd: Object.keys(fakeFs),
    ls: Object.keys(fakeFs),
    ping: ['10.0.0.1', '10.0.1.10', '10.0.2.10', '8.8.8.8', 'google.com'],
    chmod: ['755', '644', '777', '+x', '-R'],
    find: ['/opt', '/var', '/etc', '-name', '-type'],
    curl: ['-s', '-o', '-X POST', 'http://localhost:8080/health', 'http://localhost:3000/api'],
  }

  // Get completions based on current input
  const getCompletions = (text: string): string[] => {
    const parts = text.split(/\s+/)
    const base = parts[0]
    const rest = parts.slice(1).join(' ')

    // If still typing the command name
    if (parts.length === 1) {
      return COMMANDS.filter((c) => c.startsWith(text) && c !== text)
    }

    // If typing arguments, offer subcommands/paths
    const subs = subcommands[base]
    if (subs) {
      const lastPart = parts[parts.length - 1]
      return subs.filter((s) => s.startsWith(lastPart) && s !== lastPart)
    }

    // Path autocomplete
    if (rest.startsWith('/') || rest.startsWith('.')) {
      const dirPath = rest.includes('/') ? rest.split('/').slice(0, -1).join('/') || '/' : '/'
      const partial = rest.split('/').pop() || ''
      const entries = fakeFs[dirPath] || []
      return entries.filter((e) => e.startsWith(partial) && e !== partial).map((e) => {
        const prefix = rest.split('/').slice(0, -1).join('/')
        return prefix ? `${prefix}/${e}` : `/${e}`
      })
    }

    // History-based suggestions
    return history.filter((h) => h.startsWith(text) && h !== text).slice(0, 5)
  }

  const handleTab = () => {
    const completions = getCompletions(input)
    if (completions.length === 0) return

    if (completions.length === 1) {
      // Single match: complete it
      const parts = input.split(/\s+/)
      if (parts.length === 1) {
        setInput(completions[0] + ' ')
      } else {
        // Complete the argument
        const base = parts[0]
        setInput(`${base} ${completions[0]} `)
      }
      setTabSuggestion('')
      setGhost('')
    } else {
      // Multiple matches: show them and find common prefix
      setTabSuggestion(completions.slice(0, 12).join('  ') + (completions.length > 12 ? `  (+${completions.length - 12} mais)` : ''))

      // Auto-fill common prefix
      const first = completions[0]
      let common = ''
      for (let i = 0; i < first.length; i++) {
        if (completions.every((c) => c[i] === first[i])) common += first[i]
        else break
      }
      if (common.length > (input.split(/\s+/).pop()?.length || 0)) {
        const parts = input.split(/\s+/)
        if (parts.length === 1) setInput(common)
        else setInput(`${parts[0]} ${common}`)
      }
    }
  }

  // Update ghost suggestion on input change (fish-style)
  useEffect(() => {
    if (!input) { setGhost(''); return }
    const completions = getCompletions(input)
    if (completions.length > 0) {
      const suggestion = completions[0]
      // Show the remaining part as ghost
      if (input.split(/\s+/).length === 1 && suggestion.startsWith(input)) {
        setGhost(suggestion.slice(input.length))
      } else {
        const parts = input.split(/\s+/)
        const lastPart = parts[parts.length - 1]
        if (suggestion.startsWith(lastPart)) {
          setGhost(suggestion.slice(lastPart.length))
        } else {
          setGhost('')
        }
      }
    } else {
      // Also suggest from history
      const histMatch = history.find((h) => h.startsWith(input) && h !== input)
      setGhost(histMatch ? histMatch.slice(input.length) : '')
    }
  }, [input, history])

  // Accept ghost suggestion with → arrow
  const acceptGhost = () => {
    if (ghost) {
      setInput(input + ghost)
      setGhost('')
      setTabSuggestion('')
    }
  }

  // ─── Session duration ──────────────────────────────────────────
  const [elapsed, setElapsed] = useState('00:00')
  useEffect(() => {
    const t = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStart) / 1000)
      const m = Math.floor(diff / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }, 1000)
    return () => clearInterval(t)
  }, [sessionStart])

  // ─── Search highlighting ───────────────────────────────────────
  const matchCount = searchQuery ? lines.filter((l) => l.text.toLowerCase().includes(searchQuery.toLowerCase())).length : 0

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`bg-[#0c0e14] border border-atlab-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized ? 'w-full h-full m-0 rounded-none' : 'w-full max-w-4xl h-[80vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Title bar ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#12151c] border-b border-atlab-800 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" title="Fechar" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <button onClick={() => setIsMaximized(!isMaximized)} className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors" title={isMaximized ? 'Restaurar' : 'Maximizar'} />
            </div>
            <div className="flex items-center gap-2 ml-2 text-sm text-atlab-300">
              <TerminalIcon className="w-4 h-4 text-accent-400" />
              <span className="font-mono">ssh admin@{machine.ip}</span>
              <span className="text-atlab-600">—</span>
              <span className="text-atlab-500">{machine.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {copied && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 animate-fade-in">
                <Copy className="w-3 h-3" /> copiado
              </span>
            )}
            <button onClick={() => setSearchOpen(!searchOpen)} className={`p-1.5 rounded transition-colors ${searchOpen ? 'bg-accent-600/20 text-accent-400' : 'text-atlab-500 hover:text-white'}`} title="Buscar (Ctrl+F)">
              <Search className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsMaximized(!isMaximized)} className="p-1.5 text-atlab-500 hover:text-white rounded transition-colors" title={isMaximized ? 'Restaurar' : 'Maximizar'}>
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <span className={`flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-yellow-400'}`}>
              <Circle className={`w-2 h-2 fill-current ${connected ? '' : 'animate-pulse'}`} />
              {connected ? 'conectado' : 'conectando'}
            </span>
            <button onClick={onClose} className="p-1.5 text-atlab-500 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Search bar ─────────────────────────────────────── */}
        {searchOpen && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#12151c] border-b border-atlab-800 shrink-0 animate-fade-in">
            <Search className="w-4 h-4 text-atlab-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no terminal..."
              autoFocus
              className="flex-1 bg-transparent text-white text-sm placeholder-atlab-500 focus:outline-none font-mono"
            />
            {searchQuery && <span className="text-xs text-atlab-400">{matchCount} resultados</span>}
            <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="text-atlab-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── Terminal body ───────────────────────────────────── */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto p-5 font-mono text-[13px] leading-[1.7] cursor-text"
          onClick={() => inputRef.current?.focus()}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          {lines.map((l, i) => {
            const highlighted = searchQuery && l.text.toLowerCase().includes(searchQuery.toLowerCase())
            return (
              <div key={i} className={`${
                l.type === 'system' ? 'text-atlab-500 italic' :
                l.type === 'input' ? 'text-white' :
                l.type === 'error' ? 'text-red-400' :
                l.type === 'success' ? 'text-emerald-400' : 'text-atlab-200'
              } ${highlighted ? 'bg-yellow-500/10 rounded px-1 -mx-1' : ''}`}>
                {l.text || '\u00A0'}
              </div>
            )
          })}
          {tabSuggestion && (
            <div className="text-atlab-500 text-xs mt-1 font-mono">{tabSuggestion}</div>
          )}
          {connected && (
            <div className="flex items-center text-white relative">
              <span className="text-emerald-400 mr-2 whitespace-nowrap select-none">{prompt}</span>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  autoFocus
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setTabSuggestion('') }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit()
                    if (e.key === 'Tab') { e.preventDefault(); handleTab() }
                    if (e.key === 'ArrowRight' && ghost && (inputRef.current?.selectionStart === input.length)) { e.preventDefault(); acceptGhost() }
                    if (e.key === 'ArrowUp') { e.preventDefault(); const ni = Math.min(histIdx + 1, history.length - 1); if (history[ni]) { setInput(history[ni]); setHistIdx(ni) } }
                    if (e.key === 'ArrowDown') { e.preventDefault(); const ni = histIdx - 1; if (ni < 0) { setInput(''); setHistIdx(-1) } else { setInput(history[ni]); setHistIdx(ni) } }
                    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setLines([]) }
                    if (e.ctrlKey && e.key === 'c') { e.preventDefault(); setLines((p) => [...p, { text: `${prompt} ${input}^C`, type: 'input', ts: Date.now() }]); setInput(''); setGhost('') }
                  }}
                  className="w-full bg-transparent focus:outline-none caret-emerald-400 selection:bg-accent-600/30 relative z-10"
                  spellCheck={false}
                />
                {/* Ghost suggestion (fish-style) */}
                {ghost && (
                  <span className="absolute top-0 left-0 pointer-events-none text-atlab-600 whitespace-pre z-0" aria-hidden>
                    {input}<span className="text-atlab-600/50">{ghost}</span>
                  </span>
                )}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* ─── Status bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#12151c] border-t border-atlab-800 text-[11px] text-atlab-500 font-mono shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span>SSH-2.0 · ED25519</span>
            <span className="text-atlab-600">│</span>
            <span>{machine.ip}:{machine.sshPort}</span>
            <span className="text-atlab-600">│</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={machine.cpu > 80 ? 'text-red-400' : ''}>CPU {machine.cpu.toFixed(0)}%</span>
            <span className={machine.ram > 80 ? 'text-red-400' : ''}>RAM {machine.ram.toFixed(0)}%</span>
            <span className="text-atlab-600">│</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {elapsed}</span>
            <span className="text-atlab-600">│</span>
            <span>{lines.length} linhas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
