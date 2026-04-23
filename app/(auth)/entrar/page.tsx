'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthErrorMessage, getCallbackErrorMessage } from '@/lib/errors'

export default function EntrarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const errorCode = searchParams.get('error')
    if (errorCode) setError(getCallbackErrorMessage(errorCode))
  }, [searchParams])

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(getAuthErrorMessage(loginError.message, loginError.code))
      } else {
        router.push('/feed')
        router.refresh()
      }
    } catch {
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}/auth/callback` },
      })
      if (oauthError) {
        setError(getAuthErrorMessage(oauthError.message, oauthError.code))
        setLoading(false)
      }
    } catch {
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Fiufeed</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Bem-vindo de volta</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
          disabled={loading}
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--hover-bg)' }}
          onMouseLeave={(event) => { event.currentTarget.style.background = 'var(--surface)' }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Entrar com Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>ou</span>
          <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="seu@email.com"
              className="w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {error && (
            <p className="rounded-lg px-3 py-2 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          Não tem conta?{' '}
          <Link href="/cadastro" className="font-medium" style={{ color: 'var(--text)' }}>
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
