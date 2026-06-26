import { useState } from 'react'
import { AlertTriangle, X, Loader2, ShieldAlert } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText: string
  danger?: boolean
  requireTyping?: string    // force user to type this to confirm
  isBaremetal?: boolean
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText, danger, requireTyping, isBaremetal }: Props) {
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const canConfirm = requireTyping ? typed === requireTyping : true

  const handleConfirm = () => {
    setLoading(true)
    setTimeout(() => {
      onConfirm()
      setLoading(false)
      setTyped('')
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-atlab-900 border border-atlab-700 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
              {isBaremetal ? <ShieldAlert className="w-6 h-6 text-red-400" /> : <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-400' : 'text-yellow-400'}`} />}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-sm text-atlab-400 mt-1">{message}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-atlab-800 rounded-lg text-atlab-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {isBaremetal && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-300 font-medium">⚠️ ATENÇÃO: Esta é uma máquina física (baremetal).</p>
              <p className="text-xs text-red-400 mt-1">O desligamento requer acesso físico ou IPMI/iDRAC para religá-la. Todas as VMs e containers hospedados neste nó serão afetados.</p>
            </div>
          )}

          {requireTyping && (
            <div className="mt-4">
              <p className="text-xs text-atlab-400 mb-2">
                Para confirmar, digite: <code className="text-red-400 bg-atlab-800 px-1.5 py-0.5 rounded font-mono">{requireTyping}</code>
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={requireTyping}
                className="w-full px-4 py-2.5 bg-atlab-850 border border-atlab-700 rounded-lg text-white font-mono text-sm placeholder-atlab-600 focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-atlab-800">
          <button onClick={onClose} className="px-4 py-2 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-atlab-300 text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className={`px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-40 ${
              danger ? 'bg-red-600 hover:bg-red-500' : 'bg-yellow-600 hover:bg-yellow-500'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
