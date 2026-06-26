import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useApp } from '../../store/AppContext'

const config = {
  success: { icon: CheckCircle, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  error: { icon: XCircle, color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
  info: { icon: Info, color: 'text-atlab-400', border: 'border-atlab-500/30', bg: 'bg-atlab-500/10' },
}

export default function Toaster() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-3 w-80">
      {toasts.map((t) => {
        const c = config[t.type]
        const Icon = c.icon
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.border} ${c.bg} backdrop-blur-md shadow-xl animate-slide-in`}
          >
            <Icon className={`w-5 h-5 ${c.color} shrink-0`} />
            <p className="text-sm text-white flex-1">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} className="text-atlab-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
