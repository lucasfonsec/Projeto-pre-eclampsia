import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthContext } from '../contexts/AuthContext'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

const cadastroSchema = loginSchema.extend({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

const recuperacaoSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

type Mode = 'login' | 'cadastro' | 'recuperacao'

const supabaseMessages: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar',
  'User already registered': 'Este e-mail já está cadastrado',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos',
  'For security purposes': 'Por razões de segurança, aguarde antes de tentar novamente',
}

function traduzirErro(msg: string): string {
  for (const [key, value] of Object.entries(supabaseMessages)) {
    if (msg.includes(key)) return value
  }
  return msg
}

export function LoginPage() {
  const { isAuthenticated, loading, signIn, signUp, resetPassword } = useAuthContext()
  const [mode, setMode] = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const schema =
    mode === 'login' ? loginSchema :
    mode === 'cadastro' ? cadastroSchema :
    recuperacaoSchema

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema as z.ZodType),
  })

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  )

  if (isAuthenticated) return <Navigate to="/triagem" replace />

  const changeMode = (m: Mode) => { setMode(m); reset() }

  const onSubmit = async (data: Record<string, string>) => {
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(data.email, data.password)
        toast.success('Login realizado com sucesso!')
      } else if (mode === 'cadastro') {
        await signUp(data.email, data.password, data.nome)
        toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
        changeMode('login')
      } else {
        await resetPassword(data.email)
        toast.success('E-mail de recuperação enviado. Verifique sua caixa de entrada.')
        changeMode('login')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(traduzirErro(msg))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 border-r border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30">
            <Heart className="h-6 w-6 text-indigo-400" />
          </div>
          <span className="text-xl font-bold text-slate-100">PredGest</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-slate-100 leading-tight mb-4">
            Apoio à decisão<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">
              clínica em gestação
            </span>
          </h2>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Estimativa de risco de progressão de hipertensão gestacional para
            pré-eclâmpsia, com acompanhamento longitudinal baseado em evidências ISSHP/FEBRASGO.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '0.91', label: 'AUC do modelo' },
              { value: '86%', label: 'Sensibilidade' },
              { value: '82%', label: 'Especificidade' },
              { value: '4.820', label: 'Casos de treinamento' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
                <p className="text-2xl font-bold font-mono text-indigo-400">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ⚕️ Ferramenta de apoio à decisão clínica. Não substitui a avaliação médica nem constitui diagnóstico.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Heart className="h-7 w-7 text-indigo-400" />
            <span className="text-2xl font-bold text-slate-100">PredGest</span>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100">
                {mode === 'login' ? 'Entrar na plataforma' :
                 mode === 'cadastro' ? 'Criar conta' : 'Recuperar senha'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {mode === 'login' ? 'Acesse com seu e-mail institucional' :
                 mode === 'cadastro' ? 'Preencha os dados para criar sua conta' :
                 'Informe seu e-mail para receber o link de recuperação'}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {mode === 'cadastro' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nome completo
                  </label>
                  <input
                    {...register('nome')}
                    type="text"
                    placeholder="Dra. Maria Silva"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  {errors.nome && (
                    <p className="mt-1 text-xs text-red-400">{String(errors.nome.message)}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  E-mail
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{String(errors.email.message)}</p>
                )}
              </div>

              {mode !== 'recuperacao' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 pr-11 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-400">{String(errors.password.message)}</p>
                  )}
                </div>
              )}

              {mode === 'cadastro' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Confirmar senha
                  </label>
                  <input
                    {...register('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-400">{String(errors.confirmPassword.message)}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Entrar' :
                 mode === 'cadastro' ? 'Criar conta' : 'Enviar link de recuperação'}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-2 text-center text-sm">
              {mode === 'login' && (
                <>
                  <button
                    onClick={() => changeMode('recuperacao')}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                  <button
                    onClick={() => changeMode('cadastro')}
                    className="text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Não tem conta? <span className="text-indigo-400">Cadastre-se</span>
                  </button>
                </>
              )}
              {mode !== 'login' && (
                <button
                  onClick={() => changeMode('login')}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  ← Voltar ao login
                </button>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            ⚕️ Ferramenta de apoio clínico. Não substitui avaliação médica.
          </p>
        </div>
      </div>
    </div>
  )
}
