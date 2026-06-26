/**
 * App.tsx — Root da aplicação ATLAB Platform
 *
 * Responsável por:
 * - Providers globais (Theme, Auth, App state)
 * - Roteamento principal
 * - Proteção de rotas (redirect para login se não autenticado)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/AuthContext'
import { ThemeProvider } from './store/ThemeContext'
import { AppProvider } from './store/AppContext'

// Layout & shared
import Layout from './components/layout/Layout'
import CommandPalette from './components/shared/CommandPalette'
import Toaster from './components/shared/Toaster'

// Auth
import Login from './pages/auth/Login'

// Dashboard
import Dashboard from './pages/dashboard/Dashboard'

// Machines (gerenciamento, provisionamento, power control)
import Machines from './pages/machines/Machines'
import Provision from './pages/machines/Provision'
import Shutdown from './pages/machines/Shutdown'
import WakeOnLan from './pages/machines/WakeOnLan'

// Monitoring (alertas, logs, automações, topologia)
import Alerts from './pages/monitoring/Alerts'
import ActivityLog from './pages/monitoring/ActivityLog'
import Automation from './pages/monitoring/Automation'
import Topology from './pages/monitoring/Topology'

// Network (IPAM, Proxmox)
import IPAM from './pages/network/IPAM'
import Proxmox from './pages/network/Proxmox'

// Security (scanner, lockdown)
import Security from './pages/security/Security'
import Lockdown from './pages/security/Lockdown'

// Access (credenciais, grupos, conta)
import Credentials from './pages/access/Credentials'
import Groups from './pages/access/Groups'
import Account from './pages/access/Account'

// Tools (playbooks, relatórios, notificações, multi-terminal)
import Playbooks from './pages/tools/Playbooks'
import Reports from './pages/tools/Reports'
import Notifications from './pages/tools/Notifications'
import MultiTerminal from './pages/tools/MultiTerminal'

/**
 * ProtectedApp — renderiza a aplicação completa se autenticado,
 * caso contrário mostra a tela de login.
 */
function ProtectedApp() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="h-screen bg-atlab-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Login />

  return (
    <AppProvider>
      <CommandPalette />
      <Toaster />
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Machines */}
          <Route path="machines" element={<Machines />} />
          <Route path="provision" element={<Provision />} />
          <Route path="shutdown" element={<Shutdown />} />
          <Route path="wol" element={<WakeOnLan />} />

          {/* Monitoring */}
          <Route path="topology" element={<Topology />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="activity" element={<ActivityLog />} />
          <Route path="automation" element={<Automation />} />

          {/* Network */}
          <Route path="ipam" element={<IPAM />} />
          <Route path="proxmox" element={<Proxmox />} />

          {/* Security */}
          <Route path="security" element={<Security />} />
          <Route path="lockdown" element={<Lockdown />} />

          {/* Tools */}
          <Route path="playbooks" element={<Playbooks />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="multiterminal" element={<MultiTerminal />} />

          {/* Access */}
          <Route path="credentials" element={<Credentials />} />
          <Route path="groups" element={<Groups />} />
          <Route path="account" element={<Account />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  )
}

/**
 * App — wrapper mais externo.
 * Providers de tema e auth envolvem toda a árvore.
 */
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ProtectedApp />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
