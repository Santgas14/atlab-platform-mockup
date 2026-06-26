/**
 * security.ts — Motor de análise de vulnerabilidades ATLAB
 *
 * Realiza scan estático nas máquinas para detectar:
 * - Acesso inseguro (root SSH, senha, sem chave)
 * - Rede (IPs externos, firewall desativado)
 * - Comportamento (comandos suspeitos em sessões auditadas)
 * - Saúde (temperatura, disco cheio)
 * - Sistema (patches antigos, CVEs, SO EOL)
 *
 * Em produção, integrar com: trivy, grype, auditd, lynis.
 */

import type { Machine, AuditSession, Finding, FindingSeverity } from './types'

const SUSPICIOUS_PATTERNS: { rx: RegExp; label: string }[] = [
  { rx: /rm\s+-rf\s+\/(?!\w)/, label: 'remoção destrutiva de diretório raiz' },
  { rx: /rm\s+-rf\s+\/(var\/log|etc|boot)/, label: 'remoção de diretórios de sistema' },
  { rx: /(curl|wget).*(\||;)\s*(sh|bash)/, label: 'download e execução de script remoto' },
  { rx: /chmod\s+(-R\s+)?777/, label: 'permissões inseguras (777)' },
  { rx: /:\(\)\s*\{.*\};:/, label: 'fork bomb' },
  { rx: /systemctl\s+(stop|disable)\s+(firewalld|ufw|fail2ban)/, label: 'desativação de proteção de segurança' },
  { rx: /(nc|netcat)\s+.*-e/, label: 'reverse shell via netcat' },
  { rx: /\/dev\/tcp\//, label: 'conexão de rede via bash' },
  { rx: /crontab\s+-[er]/, label: 'modificação de cron (possível persistência)' },
  { rx: /history\s+-c|>\s*~\/\.bash_history/, label: 'limpeza de histórico (anti-forense)' },
  { rx: /useradd|adduser/, label: 'criação de novo usuário' },
  { rx: /passwd\s+root/, label: 'alteração de senha root' },
]

export function scanCommand(cmd: string): string | null {
  for (const p of SUSPICIOUS_PATTERNS) if (p.rx.test(cmd)) return p.label
  return null
}

const isPrivate = (ip: string) =>
  /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip === '127.0.0.1'

const sevWeight: Record<FindingSeverity, number> = { critical: 40, high: 25, medium: 12, low: 5, info: 0 }

let counter = 0
const fid = () => `f${++counter}`

export function analyzeMachine(m: Machine, sessions: AuditSession[]): Finding[] {
  const out: Finding[] = []
  const push = (severity: FindingSeverity, category: Finding['category'], title: string, detail: string, recommendation: string, evidence?: string) =>
    out.push({ id: fid(), machineId: m.id, machineName: m.name, severity, category, title, detail, recommendation, evidence })

  // ── ACCESS ──
  if (m.rootLoginEnabled) {
    push('high', 'access', 'Login root via SSH habilitado',
      'O acesso direto como root por SSH está ativo, ampliando a superfície de ataque.',
      'Defina PermitRootLogin no em /etc/ssh/sshd_config e use sudo.',
      'PermitRootLogin yes')
  }
  if (m.sshPasswordAuth) {
    push('medium', 'access', 'Autenticação SSH por senha habilitada',
      'Senhas são vulneráveis a brute-force. Apenas chaves deveriam ser permitidas.',
      'Defina PasswordAuthentication no e distribua chaves públicas.',
      'PasswordAuthentication yes')
  }
  const sudoers = m.users.filter((u) => u.sudo)
  if (sudoers.length > 2) {
    push('medium', 'access', `${sudoers.length} usuários com privilégio root/sudo`,
      'Excesso de contas privilegiadas aumenta o risco de comprometimento.',
      'Revise e reduza o número de usuários com sudo ao mínimo necessário.',
      sudoers.map((u) => u.username).join(', '))
  }
  m.users.filter((u) => u.sudo && !u.sshKeyOnly).forEach((usr) => {
    push('high', 'access', `Usuário privilegiado "${usr.username}" sem chave SSH obrigatória`,
      'Conta com sudo aceita login por senha — alvo prioritário de ataque.',
      `Force autenticação por chave para ${usr.username}.`)
  })

  // ── NETWORK ──
  m.users.filter((usr) => !isPrivate(usr.fromIp)).forEach((usr) => {
    push('critical', 'network', `Acesso externo detectado: ${usr.username}`,
      `Login de ${usr.fromIp}, um IP fora da rede interna do laboratório.`,
      'Bloqueie SSH na borda e exija VPN/Tailscale para acesso remoto.',
      `${usr.username}@${usr.fromIp}`)
  })
  if (!m.firewallEnabled && m.status !== 'offline') {
    push('high', 'network', 'Firewall desativado',
      'A máquina está sem firewall ativo, expondo todas as portas.',
      'Ative ufw/firewalld e permita apenas as portas necessárias.')
  }

  // ── BEHAVIOR (audit de sessões) ──
  const machineSessions = sessions.filter((s) => s.machineId === m.id)
  machineSessions.forEach((sess) => {
    const flagged = sess.commands.filter((c) => c.suspicious || scanCommand(c.cmd))
    flagged.forEach((c) => {
      const reason = scanCommand(c.cmd) || 'comando marcado como suspeito'
      push('critical', 'behavior', `Comando suspeito por ${sess.user}`,
        `Detectado: ${reason}.`,
        'Investigue a sessão, isole a máquina se necessário e rode forense.',
        c.cmd)
    })
  })

  // ── HEALTH (mal funcionamento) ──
  if (m.cpuTempC >= 85) {
    push('high', 'health', 'Temperatura de CPU crítica',
      `CPU operando a ${m.cpuTempC}°C, acima do limite seguro (85°C).`,
      'Verifique refrigeração, pasta térmica e ventilação do rack.',
      `${m.cpuTempC}°C`)
  }
  if (m.gpu && m.gpu.tempC >= 80) {
    push('medium', 'health', 'Temperatura de GPU elevada',
      `${m.gpu.model} a ${m.gpu.tempC}°C.`,
      'Reduza carga de GPU ou melhore o fluxo de ar.')
  }
  m.disks.filter((d) => d.usedPct >= 90).forEach((d) => {
    push('high', 'health', `Disco quase cheio: ${d.mount}`,
      `${d.device} em ${d.usedPct}% de uso.`,
      'Libere espaço ou expanda o volume antes de falha de escrita.')
  })
  m.disks.filter((d) => d.health !== 'OK').forEach((d) => {
    push('high', 'health', `Saúde de disco degradada: ${d.device}`,
      `SMART reporta status ${d.health}.`,
      'Substitua o disco e verifique backups.')
  })
  if (m.cpu > 95 && m.status !== 'offline') {
    push('medium', 'health', 'CPU saturada de forma sustentada',
      `Uso de CPU em ${m.cpu.toFixed(0)}%, possível mal funcionamento ou sobrecarga.`,
      'Investigue processos com top/htop e considere escalar recursos.')
  }

  // ── SYSTEM (vulnerabilidades de sistema) ──
  const daysSincePatch = Math.floor((Date.now() - m.lastPatched) / 86_400_000)
  if (daysSincePatch > 90) {
    push(daysSincePatch > 180 ? 'critical' : 'high', 'system', 'Sistema desatualizado',
      `Último patch há ${daysSincePatch} dias.`,
      'Aplique atualizações de segurança imediatamente.',
      `${daysSincePatch} dias sem patch`)
  }
  m.cves.forEach((cve) => {
    push('critical', 'system', `Vulnerabilidade conhecida: ${cve}`,
      'CVE de alta severidade presente na versão instalada.',
      `Atualize o pacote afetado para mitigar ${cve}.`,
      cve)
  })
  if (/CentOS\s*7/.test(`${m.os} ${m.osVersion}`)) {
    push('high', 'system', 'Sistema operacional em fim de vida (EOL)',
      'CentOS 7 não recebe mais atualizações de segurança.',
      'Migre para uma distribuição suportada (Rocky/Alma/Ubuntu).')
  }

  return out
}

export function analyzeAll(machines: Machine[], sessions: AuditSession[]): Finding[] {
  return machines.flatMap((m) => analyzeMachine(m, sessions))
}

export function riskScore(findings: Finding[]): number {
  const raw = findings.reduce((s, f) => s + sevWeight[f.severity], 0)
  return Math.min(100, raw)
}

export function riskLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'CRÍTICO', color: '#f87171' }
  if (score >= 40) return { label: 'ALTO', color: '#fb923c' }
  if (score >= 20) return { label: 'MODERADO', color: '#fbbf24' }
  if (score > 0) return { label: 'BAIXO', color: '#34d399' }
  return { label: 'SEGURO', color: '#34d399' }
}
