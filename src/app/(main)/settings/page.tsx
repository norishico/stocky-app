'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { GearSix, Copy, Check, SignOut, Users } from '@phosphor-icons/react'

export default function SettingsPage() {
  const { household, userDoc, signOut } = useAuth()
  const [copied, setCopied] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    if (household) {
      setInviteUrl(`${window.location.origin}/setup?join=${household.id}`)
    }
  }, [household])

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setShowFallback(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API非対応のブラウザはURLを表示して手動コピー
      setShowFallback(true)
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
        <GearSix size={22} weight="fill" className="text-forest-500" />
        設定
      </h1>

      {/* グループ情報 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">グループ</p>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center flex-shrink-0">
            <Users size={20} weight="fill" className="text-forest-500" />
          </div>
          <div>
            <p className="font-semibold text-stone-900">{household?.name ?? '—'}</p>
            <p className="text-xs text-stone-400">{household?.members.length ?? 0}人のメンバー</p>
          </div>
        </div>

        <p className="text-sm font-medium text-stone-700 mb-1">招待リンク</p>
        <p className="text-xs text-stone-400 mb-3">このリンクを共有するとグループに参加できます</p>

        <button
          onClick={handleCopy}
          disabled={!inviteUrl}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
            copied
              ? 'bg-forest-50 text-forest-600 border-2 border-forest-300'
              : 'bg-forest-500 text-white hover:bg-forest-600 disabled:opacity-50'
          }`}
        >
          {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
          {copied ? 'コピーしました！' : '招待リンクをコピー'}
        </button>

        {/* クリップボードAPI非対応時のフォールバック */}
        {showFallback && (
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-1.5">下のURLを長押しでコピーしてください</p>
            <input
              readOnly
              value={inviteUrl}
              onFocus={(e) => e.target.select()}
              className="w-full text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>
        )}
      </div>

      {/* アカウント */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">アカウント</p>
        <div className="mb-4">
          <p className="font-medium text-stone-900">{userDoc?.name}</p>
          <p className="text-sm text-stone-400">{userDoc?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 font-medium text-sm hover:bg-red-50 transition-colors border-2 border-red-100"
        >
          <SignOut size={16} weight="bold" />
          ログアウト
        </button>
      </div>
    </div>
  )
}
