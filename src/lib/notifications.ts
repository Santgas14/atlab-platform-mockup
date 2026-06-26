/**
 * ATLAB Notification Service
 * 
 * Integrations:
 * - Evolution API (WhatsApp) — POST /message/sendText/{instance}
 * - Telegram Bot API — POST /bot{token}/sendMessage
 * 
 * In production, these calls go through the backend.
 * The frontend stores configuration and triggers via API.
 */

export interface NotificationChannel {
  id: string
  type: 'whatsapp' | 'telegram'
  name: string
  enabled: boolean
  config: WhatsAppConfig | TelegramConfig
}

export interface WhatsAppConfig {
  evolutionApiUrl: string    // ex: http://localhost:8080
  instanceName: string       // ex: atlab-alerts
  apiKey: string             // Bearer token
  targetNumber: string       // ex: 5511999990000@s.whatsapp.net
  groupId?: string           // for group messages: 120363xxx@g.us
}

export interface TelegramConfig {
  botToken: string           // from @BotFather
  chatId: string             // group or user chat ID
}

export type NotificationEvent = 
  | 'machine_down'
  | 'machine_critical'
  | 'vulnerability_critical'
  | 'attack_detected'
  | 'baremetal_shutdown'
  | 'provisioning_complete'
  | 'backup_failed'

export interface NotificationRule {
  id: string
  event: NotificationEvent
  channels: string[]        // channel IDs
  enabled: boolean
  label: string
}

// ─── Evolution API Integration ───────────────────────────────────

export function buildEvolutionPayload(config: WhatsAppConfig, message: string) {
  // Evolution API v2 endpoint: POST {baseUrl}/message/sendText/{instance}
  return {
    url: `${config.evolutionApiUrl}/message/sendText/${config.instanceName}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.apiKey,
    },
    body: {
      number: config.groupId || config.targetNumber,
      text: message,
    },
  }
}

// ─── Telegram Bot Integration ────────────────────────────────────

export function buildTelegramPayload(config: TelegramConfig, message: string) {
  return {
    url: `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      chat_id: config.chatId,
      text: message,
      parse_mode: 'HTML',
    },
  }
}

// ─── Message Templates ───────────────────────────────────────────

export function formatAlertMessage(event: NotificationEvent, data: { machine?: string; detail?: string; severity?: string }) {
  const timestamp = new Date().toLocaleString('pt-BR')
  const header = '🔔 <b>ATLAB Alert</b>'

  switch (event) {
    case 'machine_down':
      return `${header}\n\n⚠️ <b>Máquina Offline</b>\n🖥️ ${data.machine}\n📝 ${data.detail || 'Máquina não responde'}\n🕐 ${timestamp}`
    case 'machine_critical':
      return `${header}\n\n🔴 <b>Estado Crítico</b>\n🖥️ ${data.machine}\n📝 ${data.detail || 'CPU/RAM em nível crítico'}\n🕐 ${timestamp}`
    case 'vulnerability_critical':
      return `${header}\n\n🛡️ <b>Vulnerabilidade Crítica</b>\n🖥️ ${data.machine}\n📝 ${data.detail}\n🕐 ${timestamp}`
    case 'attack_detected':
      return `${header}\n\n🚨 <b>ATAQUE DETECTADO</b>\n🖥️ ${data.machine}\n📝 ${data.detail}\n⚡ Ação imediata necessária\n🕐 ${timestamp}`
    case 'baremetal_shutdown':
      return `${header}\n\n🔌 <b>Baremetal Desligado</b>\n🖥️ ${data.machine}\n📝 Desligamento solicitado pelo operador\n🕐 ${timestamp}`
    case 'provisioning_complete':
      return `${header}\n\n✅ <b>Provisioning Completo</b>\n🖥️ ${data.machine}\n📝 ${data.detail || 'VM/CT criado com sucesso'}\n🕐 ${timestamp}`
    case 'backup_failed':
      return `${header}\n\n❌ <b>Backup Falhou</b>\n🖥️ ${data.machine}\n📝 ${data.detail}\n🕐 ${timestamp}`
    default:
      return `${header}\n\n📋 ${data.detail}\n🕐 ${timestamp}`
  }
}

// Default configuration
export const defaultChannels: NotificationChannel[] = [
  {
    id: 'wpp-alerts',
    type: 'whatsapp',
    name: 'WhatsApp — Grupo Alertas ATLAB',
    enabled: true,
    config: {
      evolutionApiUrl: 'http://evolution.atlab.local:8080',
      instanceName: 'atlab-alerts',
      apiKey: '',
      targetNumber: '',
      groupId: '',
    } as WhatsAppConfig,
  },
  {
    id: 'tg-infra',
    type: 'telegram',
    name: 'Telegram — Bot Infra ATLAB',
    enabled: true,
    config: {
      botToken: '',
      chatId: '',
    } as TelegramConfig,
  },
]

export const defaultRules: NotificationRule[] = [
  { id: 'r1', event: 'machine_down', channels: ['wpp-alerts', 'tg-infra'], enabled: true, label: 'Máquina caiu / desligou' },
  { id: 'r2', event: 'machine_critical', channels: ['tg-infra'], enabled: true, label: 'Máquina em estado crítico' },
  { id: 'r3', event: 'vulnerability_critical', channels: ['wpp-alerts', 'tg-infra'], enabled: true, label: 'Vulnerabilidade crítica detectada' },
  { id: 'r4', event: 'attack_detected', channels: ['wpp-alerts', 'tg-infra'], enabled: true, label: 'Ataque / comportamento suspeito' },
  { id: 'r5', event: 'baremetal_shutdown', channels: ['wpp-alerts', 'tg-infra'], enabled: true, label: 'Desligamento de baremetal' },
  { id: 'r6', event: 'provisioning_complete', channels: ['tg-infra'], enabled: false, label: 'Provisionamento concluído' },
  { id: 'r7', event: 'backup_failed', channels: ['wpp-alerts'], enabled: true, label: 'Falha de backup' },
]
