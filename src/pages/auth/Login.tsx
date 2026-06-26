import { useState } from 'react'
import { Terminal, Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'

export default function Login() {
  const { login, loginWithAuthentik, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const ok = await login(email, password)
    if (!ok) setError('Credenciais inválidas')
  }

  return (
    <div className="min-h-screen bg-atlab-950 dot-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-accent-600/20">
            <Terminal className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-[0.25em]">ATLAB</h1>
          <p className="text-atlab-400 text-sm mt-1">Laboratório Alan Turing · Plataforma de Infraestrutura</p>
        </div>

        {/* Login Card */}
        <div className="bg-atlab-900 border border-atlab-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Entrar na plataforma</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-atlab-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@atlab.local"
                autoFocus
                required
                className="w-full px-4 py-3 bg-atlab-850 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-accent-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-atlab-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-atlab-850 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-accent-500 transition-colors pr-12"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-atlab-400 hover:text-white">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-accent-600 hover:bg-accent-500 disabled:opacity-60 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isLoading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-atlab-800" /></div>
            <div className="relative flex justify-center"><span className="bg-atlab-900 px-3 text-xs text-atlab-500">ou</span></div>
          </div>

          <button
            onClick={loginWithAuthentik}
            className="w-full py-3 bg-atlab-850 hover:bg-atlab-800 border border-atlab-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Entrar com Authentik SSO
          </button>

          <p className="text-xs text-atlab-500 text-center mt-6">
            Protegido por Authentik · OIDC / OAuth2
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 bg-atlab-900/50 border border-atlab-800 rounded-xl p-4">
          <p className="text-xs text-atlab-400 font-medium mb-2">Contas de demonstração:</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="text-atlab-300">admin@atlab.local</div><div className="text-atlab-500">admin</div>
            <div className="text-atlab-300">joao@atlab.local</div><div className="text-atlab-500">dev123</div>
            <div className="text-atlab-300">maria@atlab.local</div><div className="text-atlab-500">devops</div>
            <div className="text-atlab-300">viewer@atlab.local</div><div className="text-atlab-500">view</div>
          </div>
        </div>
      </div>
    </div>
  )
}
