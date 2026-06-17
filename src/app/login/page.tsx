'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Leaf } from '@phosphor-icons/react'

export default function LoginPage() {
  const { firebaseUser, userDoc, loading, signIn, signUp } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading) return
    if (firebaseUser) {
      if (!userDoc?.householdId) {
        const params = new URLSearchParams(window.location.search)
        const joinId = params.get('join')
        if (joinId) {
          router.replace(`/setup?join=${joinId}`)
          return
        }
      }
      router.replace(userDoc?.householdId ? '/food' : '/setup')
    }
  }, [loading, firebaseUser, userDoc, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (!name.trim()) { setError('名前を入力してください'); setSubmitting(false); return }
        await signUp(email, password, name.trim())
      }
    } catch (err: unknown) {
      const msg = (err as { code?: string })?.code
      if (msg === 'auth/invalid-credential' || msg === 'auth/wrong-password') setError('メールアドレスまたはパスワードが違います')
      else if (msg === 'auth/email-already-in-use') setError('このメールアドレスはすでに登録済みです')
      else if (msg === 'auth/weak-password') setError('パスワードは6文字以上にしてください')
      else setError('エラーが発生しました。もう一度お試しください')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-cream">
        <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 relative overflow-hidden bg-gradient-to-b from-forest-50 via-cream to-cream">
      {/* 装飾リーフ */}
      <div className="absolute top-12 right-8 opacity-[0.07] pointer-events-none select-none" aria-hidden>
        <Leaf size={120} weight="fill" className="text-forest-500 -rotate-12" />
      </div>
      <div className="absolute bottom-20 left-6 opacity-[0.06] pointer-events-none select-none" aria-hidden>
        <Leaf size={90} weight="fill" className="text-forest-500 rotate-[30deg]" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* ブランドエリア */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-forest-500 text-white mb-5 shadow-xl shadow-forest-500/25">
            <Leaf size={40} weight="fill" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight font-round">Stocky</h1>
          <p className="text-stone-400 mt-2 text-sm">家族の在庫をかしこく管理</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
          {/* タブ */}
          <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'
                }`}
              >
                {m === 'login' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">名前</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：たろう"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">メールアドレス</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">パスワード</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-forest-500 hover:bg-forest-600 active:bg-forest-700 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 mt-2"
            >
              {submitting ? '処理中…' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
