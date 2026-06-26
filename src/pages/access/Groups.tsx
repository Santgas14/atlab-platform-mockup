import { Users, Plus, Server, Shield, ChevronRight } from 'lucide-react'
import { initialGroups } from '../../lib/mockData'
import { useApp } from '../../store/AppContext'

const permissionColors: Record<string, string> = {
  ssh: 'bg-blue-400/10 text-blue-400',
  sudo: 'bg-amber-400/10 text-amber-400',
  provisionar: 'bg-purple-400/10 text-purple-400',
  gerenciar: 'bg-red-400/10 text-red-400',
}

const groupColors: Record<string, string> = {
  red: 'from-red-500 to-red-700',
  blue: 'from-blue-500 to-blue-700',
  purple: 'from-purple-500 to-purple-700',
  emerald: 'from-emerald-500 to-emerald-700',
  amber: 'from-amber-500 to-amber-700',
}

export default function Groups() {
  const { toast } = useApp()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Grupos de Acesso</h1>
          <p className="text-atlab-400 mt-1">Controle de permissões RBAC por grupo</p>
        </div>
        <button onClick={() => toast('info', 'Criação de grupo em breve')} className="flex items-center gap-2 px-4 py-2.5 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Grupo
        </button>
      </div>

      <div className="space-y-4">
        {initialGroups.map((group) => (
          <div key={group.id} onClick={() => toast('info', `Abrindo detalhes de ${group.name}`)} className="bg-atlab-900 border border-atlab-800 rounded-xl p-5 hover:border-atlab-600 transition-all cursor-pointer group/card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${groupColors[group.color]} rounded-xl flex items-center justify-center`}>
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{group.name}</h3>
                  <p className="text-sm text-atlab-400">{group.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-atlab-600 group-hover/card:text-atlab-400 transition-colors" />
            </div>

            <div className="mt-4 pt-4 border-t border-atlab-800 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-atlab-500" />
                  <span className="text-xs text-atlab-400 uppercase font-medium">Membros</span>
                </div>
                <p className="text-sm text-white">{group.members} usuários</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-3.5 h-3.5 text-atlab-500" />
                  <span className="text-xs text-atlab-400 uppercase font-medium">Máquinas</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.machines.map((m) => <span key={m} className="text-xs px-2 py-0.5 bg-atlab-800 rounded text-atlab-300 font-mono">{m}</span>)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-3.5 h-3.5 text-atlab-500" />
                  <span className="text-xs text-atlab-400 uppercase font-medium">Permissões</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.permissions.map((p) => <span key={p} className={`text-xs px-2 py-0.5 rounded-full font-medium ${permissionColors[p]}`}>{p}</span>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
