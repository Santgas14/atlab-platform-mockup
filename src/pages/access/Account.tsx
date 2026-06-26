import { UserCircle, Mail, Shield, Clock, Key, LogOut, Sun, Moon, Users } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useTheme } from '../../store/ThemeContext'

export default function Account() {
  const { user, logout } = useAuth()
  const { toggle, isDark } = useTheme()

  if (!user) return null

  const roleLabels: Record<string, string> = { admin: 'Administrador', devops: 'DevOps', developer: 'Desenvolvedor', viewer: 'Observador' }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Minha Conta</h1>
        <p className="text-atlab-400 mt-1">Perfil e configurações</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{user.avatar}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-atlab-400">{user.tenant}</p>
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-600/20 text-accent-300">
                <Shield className="w-3 h-3" />
                {roleLabels[user.role] || user.role}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <Row icon={Mail} label="Email" value={user.email} />
            <Row icon={Shield} label="Role" value={roleLabels[user.role]} />
            <Row icon={Users} label="Grupos" value={user.groups.join(', ')} />
            <Row icon={Clock} label="Último login" value={new Date().toLocaleString('pt-BR')} />
            <Row icon={Key} label="Tenant" value={user.tenant} />
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Preferências</h3>
          <div className="flex items-center justify-between py-3 border-b border-atlab-800">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-4 h-4 text-atlab-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
              <span className="text-sm text-atlab-300">Tema</span>
            </div>
            <button onClick={toggle}
              className="relative w-12 h-6 bg-atlab-800 rounded-full transition-colors"
              aria-label="Toggle theme">
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${isDark ? 'left-1 bg-accent-500' : 'left-7 bg-yellow-400'}`} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-atlab-900 border border-atlab-800 rounded-xl p-6 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4">Ações</h3>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-atlab-850 hover:bg-atlab-800 rounded-lg text-white text-sm transition-colors">
            <Key className="w-4 h-4 text-atlab-400" />
            Alterar senha (via Authentik)
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-atlab-850 hover:bg-atlab-800 rounded-lg text-white text-sm transition-colors">
            <Shield className="w-4 h-4 text-atlab-400" />
            Gerenciar chaves SSH
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 text-sm transition-colors border border-red-500/20">
            <LogOut className="w-4 h-4" />
            Sair da plataforma
          </button>
        </div>

        {/* Auth info */}
        <div className="bg-atlab-900/50 border border-atlab-800 rounded-xl p-4">
          <p className="text-xs text-atlab-500">
            Autenticação gerenciada pelo <span className="text-accent-400">Authentik</span> via OIDC/OAuth2.
            Em produção, login/logout e gerenciamento de senha redirecionam para o IdP.
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-atlab-800 last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-atlab-500" />
        <span className="text-sm text-atlab-400">{label}</span>
      </div>
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}
