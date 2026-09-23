import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Bell, FilePlus, FileText,
  BarChart3, Settings, LogOut, Heart, ChevronRight,
} from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useAlertas } from '../hooks/useGestantes'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  badge?: number
}

function NavItem({ to, icon, label, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
         ${isActive
           ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
           : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
         }`
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </NavLink>
  )
}

export function Sidebar() {
  const { profile, roles, signOut } = useAuthContext()
  const navigate = useNavigate()
  const { data: alertas } = useAlertas({ somenteAbertos: true })
  const alertasAbertos = alertas?.length ?? 0

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    obstetra: 'Obstetra',
    enfermagem: 'Enfermagem',
    pesquisa: 'Pesquisa',
  }

  const primaryRole = roles[0] ?? 'obstetra'
  const isAdmin = roles.includes('admin')

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-700/50 bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30">
          <Heart className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">PredGest</h1>
          <p className="text-xs text-slate-500">Apoio à Decisão Clínica</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem to="/triagem" icon={<LayoutDashboard className="h-4 w-4" />} label="Triagem" />
        <NavItem to="/evolucao" icon={<Activity className="h-4 w-4" />} label="Evolução de Risco" />
        <NavItem
          to="/alertas"
          icon={<Bell className="h-4 w-4" />}
          label="Alertas"
          badge={alertasAbertos}
        />
        <NavItem to="/nova-consulta" icon={<FilePlus className="h-4 w-4" />} label="Nova Consulta" />
        <NavItem to="/gestantes/nova" icon={<FileText className="h-4 w-4" />} label="Cadastrar Gestante" />
        <NavItem to="/relatorios" icon={<BarChart3 className="h-4 w-4" />} label="Relatórios" />
        {isAdmin && (
          <NavItem to="/admin" icon={<Settings className="h-4 w-4" />} label="Administração" />
        )}
      </nav>

      {/* Aviso clínico */}
      <div className="mx-3 mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
        <p className="text-xs text-amber-500/80 leading-snug">
          ⚕️ Ferramenta de apoio à decisão clínica. Não substitui a avaliação médica nem constitui diagnóstico.
        </p>
      </div>

      {/* User info */}
      <div className="border-t border-slate-700/50 px-3 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 text-sm font-bold">
            {profile?.nome?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200 truncate">{profile?.nome ?? 'Carregando...'}</p>
            <p className="text-xs text-slate-500">{roleLabel[primaryRole]}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
