import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: 'admin' | 'devops' | 'developer' | 'viewer'
  groups: string[]
  tenant: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  loginWithAuthentik: () => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

// Simulated users (in production, this comes from Authentik OIDC)
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@atlab.local': {
    password: 'admin',
    user: { id: 'u1', name: 'Administrador', email: 'admin@atlab.local', avatar: 'A', role: 'admin', groups: ['Administradores'], tenant: 'ATLAB' },
  },
  'joao@atlab.local': {
    password: 'dev123',
    user: { id: 'u2', name: 'João Silva', email: 'joao@atlab.local', avatar: 'J', role: 'developer', groups: ['Desenvolvedores'], tenant: 'ATLAB' },
  },
  'maria@atlab.local': {
    password: 'devops',
    user: { id: 'u3', name: 'Maria Souza', email: 'maria@atlab.local', avatar: 'M', role: 'devops', groups: ['DevOps'], tenant: 'ATLAB' },
  },
  'viewer@atlab.local': {
    password: 'view',
    user: { id: 'u4', name: 'Observador', email: 'viewer@atlab.local', avatar: 'O', role: 'viewer', groups: ['Estagiários'], tenant: 'ATLAB' },
  },
}

// Authentik OIDC configuration (replace with real values in production)
const AUTHENTIK_CONFIG = {
  issuer: 'https://auth.atlab.local/application/o/atlab-platform/',
  clientId: 'atlab-platform-client',
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: 'openid profile email groups',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored session
    const stored = localStorage.getItem('atlab_session')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { /* invalid */ }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 800))
    const entry = MOCK_USERS[email.toLowerCase()]
    if (entry && entry.password === password) {
      setUser(entry.user)
      localStorage.setItem('atlab_session', JSON.stringify(entry.user))
      setIsLoading(false)
      return true
    }
    setIsLoading(false)
    return false
  }

  const loginWithAuthentik = () => {
    // In production, redirect to Authentik OIDC authorize endpoint
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: AUTHENTIK_CONFIG.clientId,
      redirect_uri: AUTHENTIK_CONFIG.redirectUri,
      scope: AUTHENTIK_CONFIG.scopes,
      state: crypto.randomUUID(),
    })
    // For the prototype, just simulate
    alert(`Em produção, redirecionaria para:\n\n${AUTHENTIK_CONFIG.issuer}authorize?${params.toString()}\n\nUse login local para testar.`)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('atlab_session')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, loginWithAuthentik, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
