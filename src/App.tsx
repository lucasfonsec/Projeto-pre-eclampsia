import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateLayout } from './components/PrivateLayout'
import { LoginPage } from './pages/LoginPage'
import { TriagemPage } from './pages/TriagemPage'
import { FichaPage } from './pages/FichaPage'
import { EvolucaoPage } from './pages/EvolucaoPage'
import { AlertasPage } from './pages/AlertasPage'
import { NovaConsultaPage } from './pages/NovaConsultaPage'
import { CadastroGestantePage } from './pages/CadastroGestantePage'
import { RelatoriosPage } from './pages/RelatoriosPage'
import { AdminPage } from './pages/AdminPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PrivateLayout />}>
              <Route path="/triagem" element={<TriagemPage />} />
              <Route path="/gestantes/:id" element={<FichaPage />} />
              <Route path="/gestantes/nova" element={<CadastroGestantePage />} />
              <Route path="/evolucao" element={<EvolucaoPage />} />
              <Route path="/alertas" element={<AlertasPage />} />
              <Route path="/nova-consulta" element={<NovaConsultaPage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/" element={<Navigate to="/triagem" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/triagem" replace />} />
          </Routes>
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              classNames: {
                toast: 'bg-slate-900 border border-slate-700 text-slate-100',
                success: '!border-emerald-500/30',
                error: '!border-red-500/30',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
