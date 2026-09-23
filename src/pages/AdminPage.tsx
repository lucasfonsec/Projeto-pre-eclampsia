import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Loader2, Shield, Users, Building2, Plus, Trash2 } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import type { AppRole } from '../types/supabase'

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  obstetra: 'Obstetra',
  enfermagem: 'Enfermagem',
  pesquisa: 'Pesquisa',
}

export function AdminPage() {
  const { isAdmin, loading } = useAuthContext()
  const qc = useQueryClient()
  const [novaUnidade, setNovaUnidade] = useState({ nome: '', tipo: 'alto_risco', municipio: '', uf: '' })

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
  if (!isAdmin()) return <Navigate to="/triagem" replace />

  const { data: profiles, isLoading: loadProfiles } = useQuery({
    queryKey: ['admin', 'profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*, user_roles(role)')
      if (error) throw error
      return data
    },
  })

  const { data: unidades, isLoading: loadUnidades } = useQuery({
    queryKey: ['admin', 'unidades'],
    queryFn: async () => {
      const { data, error } = await supabase.from('unidades').select('*')
      if (error) throw error
      return data
    },
  })

  const { data: membros } = useQuery({
    queryKey: ['admin', 'membros'],
    queryFn: async () => {
      const { data, error } = await supabase.from('unidade_membros').select('*')
      if (error) throw error
      return data
    },
  })

  const adicionarPapel = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'profiles'] }); toast.success('Papel atualizado') },
    onError: () => toast.error('Erro ao atualizar papel'),
  })

  const criarUnidade = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('unidades').insert(novaUnidade)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'unidades'] })
      qc.invalidateQueries({ queryKey: ['unidades'] })
      toast.success('Unidade criada')
      setNovaUnidade({ nome: '', tipo: 'alto_risco', municipio: '', uf: '' })
    },
    onError: () => toast.error('Erro ao criar unidade'),
  })

  const adicionarMembro = useMutation({
    mutationFn: async ({ unidadeId, userId }: { unidadeId: number; userId: string }) => {
      const { error } = await supabase.from('unidade_membros').insert({ unidade_id: unidadeId, user_id: userId })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'membros'] }); toast.success('Membro adicionado') },
    onError: () => toast.error('Erro ao adicionar membro'),
  })

  const removerMembro = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('unidade_membros').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'membros'] }); toast.success('Membro removido') },
    onError: () => toast.error('Erro ao remover membro'),
  })

  const inputClass = "rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          <h1 className="text-xl font-bold text-slate-100">Administração</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">Gestão de usuários, papéis e unidades</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Usuários e Papéis */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">Usuários e Papéis</h2>
          </div>
          {loadProfiles ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 text-left">
                    <th className="py-2 px-3 text-xs font-medium text-slate-500">Nome</th>
                    <th className="py-2 px-3 text-xs font-medium text-slate-500">E-mail</th>
                    <th className="py-2 px-3 text-xs font-medium text-slate-500">Papéis</th>
                    <th className="py-2 px-3 text-xs font-medium text-slate-500">Adicionar Papel</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles?.map((p: Record<string, unknown>) => {
                    const userRoles = (p.user_roles as Array<{role: AppRole}>) ?? []
                    const roleList = userRoles.map(r => r.role)
                    return (
                      <tr key={p.id as string} className="border-b border-slate-800/50">
                        <td className="py-2 px-3 text-slate-200">{p.nome as string}</td>
                        <td className="py-2 px-3 text-slate-500 text-xs">{p.email as string}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {roleList.map(r => (
                              <span key={r} className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-xs text-indigo-400">
                                {ROLE_LABELS[r]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            className={`${inputClass} text-xs`}
                            onChange={e => {
                              if (e.target.value) {
                                adicionarPapel.mutate({ userId: p.id as string, role: e.target.value as AppRole })
                                e.target.value = ''
                              }
                            }}
                          >
                            <option value="">+ Papel</option>
                            {(['admin','obstetra','enfermagem','pesquisa'] as AppRole[])
                              .filter(r => !roleList.includes(r))
                              .map(r => (
                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                              ))
                            }
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Unidades */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">Unidades de Saúde</h2>
          </div>

          {/* Criar unidade */}
          <div className="flex flex-wrap gap-2 mb-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <input
              placeholder="Nome da unidade"
              value={novaUnidade.nome}
              onChange={e => setNovaUnidade(p => ({ ...p, nome: e.target.value }))}
              className={`${inputClass} flex-1 min-w-40`}
            />
            <select
              value={novaUnidade.tipo}
              onChange={e => setNovaUnidade(p => ({ ...p, tipo: e.target.value }))}
              className={inputClass}
            >
              <option value="alto_risco">Alto risco</option>
              <option value="rotina">Rotina</option>
            </select>
            <input
              placeholder="Município"
              value={novaUnidade.municipio}
              onChange={e => setNovaUnidade(p => ({ ...p, municipio: e.target.value }))}
              className={`${inputClass} w-32`}
            />
            <input
              placeholder="UF"
              maxLength={2}
              value={novaUnidade.uf}
              onChange={e => setNovaUnidade(p => ({ ...p, uf: e.target.value.toUpperCase() }))}
              className={`${inputClass} w-16 font-mono uppercase`}
            />
            <button
              onClick={() => criarUnidade.mutate()}
              disabled={!novaUnidade.nome || !novaUnidade.municipio || !novaUnidade.uf || criarUnidade.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {criarUnidade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </button>
          </div>

          {loadUnidades ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
          ) : (
            <div className="space-y-3">
              {unidades?.map(u => {
                const membrosUnidade = membros?.filter(m => m.unidade_id === u.id) ?? []
                return (
                  <div key={u.id} className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-slate-200">{u.nome}</span>
                        <span className="ml-2 text-xs text-slate-500">{u.municipio}/{u.uf}</span>
                        <span className="ml-2 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                          {u.tipo === 'alto_risco' ? 'Alto Risco' : 'Rotina'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{membrosUnidade.length} membro(s)</span>
                        <select
                          className={`${inputClass} text-xs`}
                          onChange={e => {
                            if (e.target.value) {
                              adicionarMembro.mutate({ unidadeId: u.id, userId: e.target.value })
                              e.target.value = ''
                            }
                          }}
                        >
                          <option value="">+ Adicionar membro</option>
                          {profiles
                            ?.filter((p: Record<string, unknown>) => !membrosUnidade.some(m => m.user_id === p.id))
                            .map((p: Record<string, unknown>) => (
                              <option key={p.id as string} value={p.id as string}>{p.nome as string}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                    {membrosUnidade.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {membrosUnidade.map(m => {
                          const prof = profiles?.find((p: Record<string, unknown>) => p.id === m.user_id)
                          return (
                            <div key={m.id} className="flex items-center gap-1 rounded-full bg-slate-700 pl-2 pr-1 py-0.5 text-xs text-slate-300">
                              {(prof as Record<string, unknown>)?.nome as string ?? m.user_id.slice(0, 8)}
                              <button
                                onClick={() => removerMembro.mutate(m.id)}
                                className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
