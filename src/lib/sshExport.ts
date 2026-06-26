/**
 * sshExport.ts — Helpers de exportação de conexão SSH
 *
 * Gera formatos compatíveis com:
 * - Linha de comando SSH direta
 * - Bloco ~/.ssh/config
 * - URI ssh:// (para deep-link no Termius e outros)
 * - JSON de importação para Termius
 */

import type { Machine } from './types'

export function sshCommand(m: Machine, user = 'admin') {
  const port = m.sshPort !== 22 ? ` -p ${m.sshPort}` : ''
  return `ssh${port} ${user}@${m.ip}`
}

export function sshConfigBlock(m: Machine, user = 'admin') {
  return [
    `Host ${m.name}`,
    `    HostName ${m.ip}`,
    `    User ${user}`,
    `    Port ${m.sshPort}`,
    `    IdentityFile ~/.ssh/atlab_id_ed25519`,
    `    # ${m.group} · ${m.os} ${m.osVersion} · gerenciado pelo ATLAB`,
  ].join('\n')
}

// Termius import format (JSON host) + a deep-link style URI
export function termiusJson(m: Machine, user = 'admin') {
  return JSON.stringify(
    {
      label: m.name,
      address: m.ip,
      port: m.sshPort,
      username: user,
      group: `ATLAB / ${m.group}`,
      os: `${m.os} ${m.osVersion}`,
      tags: m.tags,
    },
    null,
    2
  )
}

export function sshUri(m: Machine, user = 'admin') {
  return `ssh://${user}@${m.ip}:${m.sshPort}`
}
