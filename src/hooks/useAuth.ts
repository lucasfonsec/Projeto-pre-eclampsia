import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile, AppRole } from '../types/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  roles: AppRole[]
  loading: boolean
}

export function useAuth() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    loading: true,
  })

  const loadProfileAndRoles = useCallback(async (user: User | null) => {
    if (!user) {
      setState({ user: null, session: null, profile: null, roles: [], loading: false })
      return
    }

    // Carregar profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Carregar papéis
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    setState(prev => ({
      ...prev,
      user,
      profile: profile ?? null,
      roles: (userRoles ?? []).map(r => r.role),
      loading: false,
    }))
  }, [])

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({ ...prev, session }))
      loadProfileAndRoles(session?.user ?? null)
    })

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState(prev => ({ ...prev, session }))
        if (session?.user) {
          loadProfileAndRoles(session.user)
        } else {
          setState({ user: null, session: null, profile: null, roles: [], loading: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfileAndRoles])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    queryClient.clear()
    setState({ user: null, session: null, profile: null, roles: [], loading: false })
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) throw error
  }

  const hasRole = (role: AppRole) => state.roles.includes(role)
  const isAdmin = () => hasRole('admin')
  const isObstetra = () => hasRole('obstetra')

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    hasRole,
    isAdmin,
    isObstetra,
    isAuthenticated: !!state.user,
  }
}
