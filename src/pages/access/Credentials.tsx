import { useState } from 'react'
import { KeyRound, Plus, Eye, EyeOff, Trash2, Edit, Copy } from 'lucide-react'
import { initialCredentials } from '../../lib/mockData'
import { useApp } from '../../store/AppContext'

const typeLabels = {
  'ssh-key': { label: 'SSH Key', color: 'bg-blue-400/10 text-blue-400' },
  'password': { label: 'Senha', color: 'bg-amber-400/10 text-amber-400' },
  'token': { label: 'Token API', color: 'bg-purple-400/10 text-purple-400' },
}

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function Credentials() {
  const { toast, logActivity } = useApp()
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Credenciais</h1>
          <p className="text-atlab-400 mt-1">Cofre de chaves SSH, senhas e tokens</p>
        </div>
        <button onClick={() => toast('info', 'Formulário de credencial em breve')} className="flex items-center gap-2 px-4 py-2.5 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nova Credencial
        </button>
      </div>

      <div className="bg-atlab-900 border border-atlab-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-atlab-800">
              {['Label', 'Tipo', 'Usuário', 'Alvo', 'Secret', 'Último uso', ''].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium text-atlab-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialCredentials.map((cred) => (
              <tr key={cred.id} className="border-b border-atlab-800/50 hover:bg-atlab-800/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-4 h-4 text-atlab-500" />
                    <span className="font-medium text-white">{cred.label}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeLabels[cred.type].color}`}>{typeLabels[cred.type].label}</span>
                </td>
                <td className="px-5 py-4 text-sm text-atlab-300 font-mono">{cred.username}</td>
                <td className="px-5 py-4 text-sm text-atlab-300 font-mono">{cred.target}</td>
                <td className="px-5 py-4">
                  <code className="text-xs text-atlab-400 font-mono">
                    {revealed[cred.id] ? (cred.type === 'token' ? 'tok_4f8a92b1c7d3e' : cred.type === 'password' ? 'P@ssw0rd!2026' : 'ssh-rsa AAAAB3Nz...') : '••••••••••••'}
                  </code>
                </td>
                <td className="px-5 py-4 text-sm text-atlab-400">há {timeAgo(cred.lastUsed)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setRevealed((r) => ({ ...r, [cred.id]: !r[cred.id] }))} className="p-2 hover:bg-atlab-700 rounded-lg text-atlab-400 hover:text-white transition-colors">
                      {revealed[cred.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { toast('success', 'Copiado para a área de transferência'); logActivity('Credencial copiada', cred.label, 'config') }} className="p-2 hover:bg-atlab-700 rounded-lg text-atlab-400 hover:text-white transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => toast('info', 'Edição em breve')} className="p-2 hover:bg-atlab-700 rounded-lg text-atlab-400 hover:text-white transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => toast('warning', `Remoção de "${cred.label}" requer confirmação`)} className="p-2 hover:bg-red-900/30 rounded-lg text-atlab-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
