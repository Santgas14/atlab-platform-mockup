# ATLAB Platform

> Plataforma de gerenciamento de infraestrutura do Laboratório Alan Turing.

## Visão Geral

Sistema unificado para gerenciar máquinas (baremetal, VMs, containers), rede, segurança,
provisionamento Proxmox, acesso SSH e automações — com métricas em tempo real e interface web moderna.

## Stack

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Frontend    | React 18 + TypeScript + Vite      |
| Styling     | Tailwind CSS (tema dark/light)    |
| Ícones      | Lucide React                      |
| Roteamento  | React Router v6                   |
| State       | Context API + hooks               |
| Charts      | SVG customizado (zero dependência)|
| Auth (prod) | Authentik via OIDC/OAuth2         |
| Notif (prod)| Evolution API (WhatsApp) + Telegram Bot |

## Estrutura do Projeto

```
src/
├── components/
│   ├── charts/          # Gráficos: Sparkline, Gauge, AreaChart, DonutChart
│   ├── layout/          # Layout principal (sidebar, topbar, routing shell)
│   ├── shared/          # Componentes reutilizáveis (modais, toasts, paleta)
│   └── terminal/        # Emulador SSH e multi-terminal
├── lib/
│   ├── types.ts         # Interfaces TypeScript do domínio
│   ├── mockData.ts      # Dados simulados (substituir por API em prod)
│   ├── security.ts      # Motor de análise de vulnerabilidades
│   ├── notifications.ts # Integrações WhatsApp/Telegram
│   └── sshExport.ts     # Helpers de export SSH (Termius, config)
├── pages/
│   ├── auth/            # Login, callback OAuth
│   ├── dashboard/       # Dashboard principal (centro de operações)
│   ├── machines/        # CRUD de máquinas, provisionamento, power control
│   ├── monitoring/      # Alertas, atividades, automações, topologia
│   ├── network/         # IPAM, gerenciamento Proxmox
│   ├── security/        # Scanner de vulnerabilidades, lockdown
│   ├── access/          # Credenciais, grupos RBAC, conta do usuário
│   └── tools/           # Playbooks, relatórios, notificações, multi-terminal
└── store/
    ├── AppContext.tsx    # Estado global (máquinas, métricas, alertas)
    ├── AuthContext.tsx   # Autenticação e sessão (Authentik OIDC)
    └── ThemeContext.tsx  # Tema dark/light
```

## Como rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:5173 e faça login com:
- `admin@atlab.local` / `admin` (administrador)
- `joao@atlab.local` / `dev123` (desenvolvedor)
- `maria@atlab.local` / `devops` (devops)

## Funcionalidades

### Operação
- Dashboard com métricas ao vivo (CPU, RAM, disco, rede, temperatura)
- Controle de máquinas (ligar, desligar, reiniciar) com confirmação séria
- Desligamento seguro em massa + agendamento
- Wake-on-LAN para ligar baremetals remotamente
- Terminal SSH interativo no browser
- Multi-terminal com modo broadcast

### Segurança
- Motor de análise de vulnerabilidades (12+ regras)
- Detecção de comandos suspeitos em sessões
- Lockdown mode (bloqueio de emergência)
- Auditoria completa de sessões SSH

### Provisionamento
- Wizard multi-step com Cloud-Init
- Seletor visual de IP disponível
- Catálogo de software pré-instalado
- Integração com API Proxmox

### Rede
- IPAM com mapa visual de IPs
- Topologia SVG interativa
- Vinculação IP ↔ máquina

### Integrações
- Authentik SSO (OIDC)
- Evolution API (WhatsApp)
- Telegram Bot
- Export SSH (Termius, ~/.ssh/config)

## Produção

Para levar a produção, substitua:
1. `lib/mockData.ts` → chamadas à API REST do backend
2. `AuthContext.tsx` → redirect real para Authentik
3. `AppContext.tsx` → WebSocket para métricas em tempo real
4. `SSHTerminal` → WebSocket + node-pty no backend

## Licença

Uso interno — Laboratório Alan Turing (ATLAB)
