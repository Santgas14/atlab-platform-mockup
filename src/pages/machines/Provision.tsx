import { useState } from 'react'
import { Server, Cloud, Check, ChevronRight, ChevronLeft, Cpu, MemoryStick, HardDrive, Rocket, Loader2, Package, User, Key, FileCode, Globe, Network } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { softwareCatalog, initialSubnets } from '../../lib/mockData'

const steps = ['Tipo', 'Identificação', 'Recursos', 'Acesso & Cloud-Init', 'Software', 'Revisão']

export default function Provision() {
  const { nodes, toast, logActivity } = useApp()
  const [step, setStep] = useState(0)
  const [deploying, setDeploying] = useState(false)
  const [form, setForm] = useState({
    type: 'vm', name: '', node: nodes[0]?.name || '', os: 'ubuntu-22.04',
    cores: 2, ram: 4, disk: 32, network: 'vmbr0', ip: '', startOnCreate: true,
    username: 'admin', password: '', sshPubKey: '', cloudInit: true, software: [] as string[],
  })

  const set = (k: string, v: string | number | boolean | string[]) => setForm({ ...form, [k]: v })
  const toggleSw = (id: string) => set('software', form.software.includes(id) ? form.software.filter((s) => s !== id) : [...form.software, id])

  const deploy = () => {
    if (!form.name) { toast('error', 'Defina um nome'); setStep(1); return }
    setDeploying(true)
    toast('info', `Provisionando ${form.name}...`)
    setTimeout(() => {
      setDeploying(false)
      toast('success', `${form.name} provisionada com sucesso em ${form.node}`)
      logActivity('VM provisionada', form.name, 'provision')
      setStep(0)
      setForm({ ...form, name: '', ip: '', password: '', software: [] })
    }, 3000)
  }

  const grouped = softwareCatalog.reduce<Record<string, typeof softwareCatalog>>((acc, s) => {
    ;(acc[s.category] = acc[s.category] || []).push(s)
    return acc
  }, {})

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Rocket className="w-6 h-6 text-accent-400" /> Provisionar Infraestrutura
        </h1>
        <p className="text-atlab-400 mt-1">Wizard de criação com Cloud-Init e catálogo de software</p>
      </div>

      {/* stepper */}
      <div className="flex items-center mb-8 max-w-4xl overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none min-w-[60px]">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-accent-600 text-white ring-4 ring-accent-600/20' : 'bg-atlab-800 text-atlab-500'
              }`}>{i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}</div>
              <span className={`text-[10px] mt-1 whitespace-nowrap ${i === step ? 'text-white' : 'text-atlab-500'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1.5 mb-5 ${i < step ? 'bg-emerald-500' : 'bg-atlab-800'}`} />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl bg-atlab-900 border border-atlab-800 rounded-xl p-6">
        {step === 0 && (
          <div className="space-y-3 animate-fade-in">
            {[{ v: 'vm', icon: Server, title: 'Máquina Virtual', desc: 'KVM/QEMU · isolamento total' }, { v: 'ct', icon: Cloud, title: 'Container LXC', desc: 'leve · compartilha kernel' }].map((opt) => (
              <button key={opt.v} onClick={() => set('type', opt.v)} className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${form.type === opt.v ? 'border-accent-500 bg-accent-600/10' : 'border-atlab-700 hover:border-atlab-600'}`}>
                <opt.icon className={`w-6 h-6 ${form.type === opt.v ? 'text-accent-400' : 'text-atlab-500'}`} />
                <div className="text-left flex-1"><p className="font-medium text-white">{opt.title}</p><p className="text-xs text-atlab-400">{opt.desc}</p></div>
                {form.type === opt.v && <Check className="w-5 h-5 text-accent-400" />}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <Input label="Nome" value={form.name} onChange={(v) => set('name', v)} placeholder="ex: srv-app01" />
            <Select label="Nó Proxmox" value={form.node} onChange={(v) => set('node', v)} options={nodes.map((n) => ({ value: n.name, label: `${n.name} ${n.status !== 'connected' ? '(offline)' : ''}`, disabled: n.status !== 'connected' }))} />
            <Select label="Sistema Operacional" value={form.os} onChange={(v) => set('os', v)} options={[
              { value: 'ubuntu-22.04', label: 'Ubuntu 22.04 LTS' }, { value: 'ubuntu-24.04', label: 'Ubuntu 24.04 LTS' },
              { value: 'debian-12', label: 'Debian 12' }, { value: 'rocky-9', label: 'Rocky Linux 9' },
              { value: 'alpine-3.19', label: 'Alpine 3.19' }, { value: 'windows-2022', label: 'Windows Server 2022' },
            ]} />
            <Select label="Rede" value={form.network} onChange={(v) => set('network', v)} options={[
              { value: 'vmbr0', label: 'vmbr0 (Produção · 10.0.2.0/24)' }, { value: 'vmbr1', label: 'vmbr1 (Dev · 10.0.3.0/24)' }, { value: 'vmbr2', label: 'vmbr2 (Mgmt · 10.0.10.0/24)' },
            ]} />
            <IpPicker network={form.network} value={form.ip} onChange={(v) => set('ip', v)} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <Slider icon={Cpu} label="CPU (cores)" value={form.cores} min={1} max={32} step={1} onChange={(v) => set('cores', v)} />
            <Slider icon={MemoryStick} label="RAM (GB)" value={form.ram} min={1} max={128} step={1} onChange={(v) => set('ram', v)} />
            <Slider icon={HardDrive} label="Disco (GB)" value={form.disk} min={8} max={1024} step={8} onChange={(v) => set('disk', v)} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><User className="w-4 h-4 text-accent-400" /> Acesso Inicial</h3>
            <Input label="Usuário" value={form.username} onChange={(v) => set('username', v)} placeholder="admin" />
            <Input label="Senha" value={form.password} onChange={(v) => set('password', v)} placeholder="••••••••" type="password" />
            <div>
              <label className="block text-sm font-medium text-atlab-300 mb-2 flex items-center gap-2"><Key className="w-3.5 h-3.5" /> Chave pública SSH</label>
              <textarea value={form.sshPubKey} onChange={(e) => set('sshPubKey', e.target.value)} placeholder="ssh-ed25519 AAAA..." rows={3}
                className="w-full px-4 py-2.5 bg-atlab-850 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-accent-500 font-mono text-xs resize-none" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer pt-2">
              <input type="checkbox" checked={form.cloudInit} onChange={(e) => set('cloudInit', e.target.checked)} className="w-4 h-4 rounded bg-atlab-800 border-atlab-600 accent-accent-500" />
              <div>
                <span className="text-sm text-white flex items-center gap-2"><FileCode className="w-3.5 h-3.5 text-accent-400" /> Cloud-Init</span>
                <p className="text-xs text-atlab-500">Configuração automática na primeira inicialização</p>
              </div>
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-accent-400" /> Softwares pré-instalados</h3>
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-atlab-400 uppercase mb-2">{cat}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((sw) => (
                      <button key={sw.id} onClick={() => toggleSw(sw.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${form.software.includes(sw.id) ? 'border-accent-500 bg-accent-600/10' : 'border-atlab-700 hover:border-atlab-600'}`}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${form.software.includes(sw.id) ? 'border-accent-500 bg-accent-500' : 'border-atlab-600'}`}>
                          {form.software.includes(sw.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="text-sm text-white">{sw.name}</p>
                          <p className="text-[10px] text-atlab-500">{sw.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-fade-in">
            <h3 className="font-semibold text-white mb-4">Revisão final</h3>
            <div className="space-y-1 text-sm">
              {[
                ['Tipo', form.type === 'vm' ? 'Máquina Virtual' : 'Container LXC'],
                ['Nome', form.name || '—'], ['Nó', form.node], ['SO', form.os],
                ['CPU', `${form.cores} cores`], ['RAM', `${form.ram} GB`], ['Disco', `${form.disk} GB`],
                ['Rede', form.network], ['IP', form.ip || 'DHCP'],
                ['Usuário', form.username], ['Senha', form.password ? '••••' : '—'],
                ['SSH Key', form.sshPubKey ? '✓ definida' : '—'],
                ['Cloud-Init', form.cloudInit ? 'Ativo' : 'Desativado'],
                ['Software', form.software.length > 0 ? form.software.join(', ') : 'nenhum'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-atlab-800">
                  <span className="text-atlab-400">{k}</span>
                  <span className="text-white font-medium text-right max-w-[60%] truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-2 px-4 py-2.5 bg-atlab-800 hover:bg-atlab-700 disabled:opacity-40 rounded-lg text-atlab-300 text-sm">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-500 rounded-lg text-white text-sm font-medium">
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={deploy} disabled={deploying} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-lg text-white text-sm font-medium">
              {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Provisionando...</> : <><Rocket className="w-4 h-4" /> Provisionar</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-atlab-300 mb-2">{label}</label>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-4 py-2.5 bg-atlab-850 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-accent-500 ${mono ? 'font-mono' : ''}`} />
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string; disabled?: boolean }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-atlab-300 mb-2">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 bg-atlab-850 border border-atlab-700 rounded-lg text-white focus:outline-none focus:border-accent-500">
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Slider({ icon: Icon, label, value, min, max, step, onChange }: { icon: typeof Cpu; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm font-medium text-atlab-300"><Icon className="w-4 h-4 text-accent-400" /> {label}</label>
        <span className="text-lg font-bold text-white tabular-nums">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent-500 h-2 bg-atlab-850 rounded-full appearance-none cursor-pointer" />
      <div className="flex justify-between text-xs text-atlab-500 mt-1"><span>{min}</span><span>{max}</span></div>
    </div>
  )
}

function IpPicker({ network, value, onChange }: { network: string; value: string; onChange: (v: string) => void }) {
  const { machines } = useApp()
  const [showGrid, setShowGrid] = useState(false)

  // Map bridge to subnet
  const subnetMap: Record<string, string> = { vmbr0: 's2', vmbr1: 's3', vmbr2: 's5' }
  const subnet = initialSubnets.find((s) => s.id === subnetMap[network])
  if (!subnet) return <Input label="IP (vazio = DHCP)" value={value} onChange={onChange} placeholder="10.0.x.x/24" mono />

  const prefix = subnet.network.split('.').slice(0, 3).join('.')
  const usedIps = new Set(machines.map((m) => m.ip))
  usedIps.add(subnet.gateway) // gateway always taken

  // Generate available IPs (skip .0, .1 gateway, .255 broadcast)
  const allIps = Array.from({ length: 253 }, (_, i) => `${prefix}.${i + 2}`)
  const available = allIps.filter((ip) => !usedIps.has(ip))

  return (
    <div>
      <label className="block text-sm font-medium text-atlab-300 mb-2 flex items-center gap-2">
        <Network className="w-3.5 h-3.5 text-accent-400" />
        IP — <span className="font-mono text-atlab-400">{subnet.network}{subnet.mask}</span>
        <span className="text-xs text-emerald-400 ml-auto">{available.length} disponíveis</span>
      </label>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${prefix}.x (vazio = DHCP)`}
          className="flex-1 px-4 py-2.5 bg-atlab-850 border border-atlab-700 rounded-lg text-white placeholder-atlab-500 focus:outline-none focus:border-accent-500 font-mono text-sm"
        />
        <button type="button" onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showGrid ? 'bg-accent-600 text-white' : 'bg-atlab-800 text-atlab-300 hover:bg-atlab-700'}`}>
          <Globe className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => { const next = available[0]; if (next) onChange(next + '/24') }}
          className="px-3 py-2 bg-atlab-800 hover:bg-atlab-700 rounded-lg text-xs text-atlab-300 transition-colors whitespace-nowrap">
          Próximo livre
        </button>
      </div>

      {showGrid && (
        <div className="bg-atlab-850 border border-atlab-800 rounded-lg p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-atlab-400">Clique num IP para selecionar</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-accent-600" /> selecionado</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/60" /> em uso</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-atlab-700" /> livre</span>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {Array.from({ length: 62 }, (_, i) => {
              const octet = i + 2
              const ip = `${prefix}.${octet}`
              const used = usedIps.has(ip)
              const isSelected = value.startsWith(ip)
              const machine = machines.find((m) => m.ip === ip)

              return (
                <button
                  key={octet}
                  type="button"
                  disabled={used}
                  onClick={() => onChange(`${ip}/24`)}
                  title={used ? `${ip} → ${machine?.name || 'reservado'}` : `${ip} — disponível`}
                  className={`py-1.5 rounded text-[10px] font-mono transition-all ${
                    isSelected ? 'bg-accent-600 text-white ring-2 ring-accent-400' :
                    used ? 'bg-red-500/20 text-red-400/60 cursor-not-allowed' :
                    'bg-atlab-700 text-atlab-300 hover:bg-atlab-600 hover:text-white cursor-pointer'
                  }`}
                >
                  .{octet}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-atlab-500 mt-2">Mostrando .2 — .63 · Total livre na sub-rede: {available.length}</p>
        </div>
      )}
    </div>
  )
}
