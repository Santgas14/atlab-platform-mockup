/**
 * types.ts — Definições de tipos TypeScript do domínio ATLAB
 *
 * Contém todas as interfaces de dados usadas pela plataforma:
 * - Machine (baremetal, VM, container) com métricas detalhadas
 * - ProxmoxNode (nós de virtualização)
 * - Subnet, Alert, ActivityEvent, AutomationTask
 * - Security findings (vulnerabilidades)
 * - Audit sessions (comandos SSH rastreados)
 * - Credentials, AccessGroups (RBAC)
 */

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'offline'

export interface CoreLoad {
  core: number
  load: number
  tempC: number
}

export interface GpuInfo {
  model: string
  usage: number
  memUsedGb: number
  memTotalGb: number
  tempC: number
  powerW: number
  fanPct: number
  clockMhz: number
  memClockMhz: number
  encoderPct: number
  decoderPct: number
}

export interface DiskInfo {
  device: string
  mount: string
  sizeGb: number
  usedPct: number
  tempC: number
  health: 'OK' | 'WARN' | 'FAIL'
}

export interface MachineUser {
  username: string
  sudo: boolean
  shell: string
  lastLogin: number
  fromIp: string
  sshKeyOnly: boolean
}

export interface SessionCommand {
  ts: number
  cmd: string
  exitCode: number
  suspicious?: boolean
}

export interface AuditSession {
  id: string
  machineId: string
  user: string
  fromIp: string
  external: boolean
  start: number
  end: number | null
  commands: SessionCommand[]
}

export interface Machine {
  id: string
  name: string
  ip: string
  os: string
  osVersion: string
  kernel: string
  type: 'vm' | 'ct' | 'physical'
  node: string
  cores: number
  ramGb: number
  diskGb: number
  status: HealthStatus
  group: string
  uptimeHours: number
  cpu: number
  ram: number
  disk: number
  netIn: number
  netOut: number
  netDownMbps: number
  netUpMbps: number
  history: number[]
  tags: string[]
  // Hardware detail
  coreLoads: CoreLoad[]
  gpu: GpuInfo | null
  disks: DiskInfo[]
  cpuTempC: number
  // Extended metrics
  loadAvg: [number, number, number]   // 1min, 5min, 15min
  swapUsedMb: number
  swapTotalMb: number
  iopsRead: number
  iopsWrite: number
  diskLatencyMs: number
  tcpConnections: number
  netErrors: number
  processesTotal: number
  processesZombie: number
  sshActiveSessions: number
  failedLoginAttempts: number
  topProcesses: ProcessInfo[]
  // Docker
  containers: ContainerInfo[]
  // Security config
  rootLoginEnabled: boolean
  sshPasswordAuth: boolean
  firewallEnabled: boolean
  sshPort: number
  users: MachineUser[]
  lastPatched: number
  cves: string[]
}

export interface ProcessInfo {
  pid: number
  name: string
  user: string
  cpu: number
  ram: number
  state: 'R' | 'S' | 'D' | 'Z' | 'T'
}

export interface ContainerInfo {
  id: string
  name: string
  image: string
  status: 'running' | 'stopped' | 'restarting'
  cpuPct: number
  ramMb: number
  restarts: number
  uptimeHours: number
}

export interface ProxmoxNode {
  id: string
  name: string
  host: string
  status: 'connected' | 'disconnected'
  version: string
  vms: number
  containers: number
  cpu: number
  ram: number
  disk: number
  cores: number
  ramTotalGb: number
  cpuModel: string
  uptimeDays: number
}

export interface Subnet {
  id: string
  network: string
  mask: string
  description: string
  totalIps: number
  usedIps: number
  vlan: string
  gateway: string
}

export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  source: string
  timestamp: number
  acknowledged: boolean
}

export interface ActivityEvent {
  id: string
  action: string
  target: string
  user: string
  timestamp: number
  type: 'ssh' | 'provision' | 'config' | 'auth' | 'delete' | 'network'
}

export interface AutomationTask {
  id: string
  name: string
  description: string
  schedule: string
  lastRun: number
  nextRun: number
  enabled: boolean
  status: 'idle' | 'running' | 'success' | 'failed'
  type: 'backup' | 'snapshot' | 'healthcheck' | 'cleanup' | 'deploy'
}

export interface Credential {
  id: string
  label: string
  type: 'ssh-key' | 'password' | 'token'
  username: string
  target: string
  createdAt: string
  lastUsed: number
}

export interface AccessGroup {
  id: string
  name: string
  description: string
  members: number
  machines: string[]
  permissions: string[]
  color: string
}

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type FindingCategory = 'access' | 'behavior' | 'network' | 'health' | 'system'

export interface Finding {
  id: string
  machineId: string
  machineName: string
  severity: FindingSeverity
  category: FindingCategory
  title: string
  detail: string
  recommendation: string
  evidence?: string
}

export interface SoftwarePackage {
  id: string
  name: string
  description: string
  category: string
}
