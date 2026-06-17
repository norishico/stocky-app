'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Users } from '@phosphor-icons/react'

function SetupContent() {
  const { firebaseUser, household, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const joinId = searchParams.get('join')

  const [householdName, setHouseholdName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [joinInfo, setJoinInfo] = useState<{ name: string } | null>(null)

  useEffect(() => {
    if (loading) return
    if (!firebaseUser) { router.replace('/login'); return }
    if (household) { router.replace('/food'); return }
  }, [loading, firebaseUser, household, router])

  useEffect(() => {
    if (!joinId) return
    const fetchHousehold = async () => {
      const snap = await getDoc(doc(db, 'households', joinId))
      if (snap.exists()) {
        setJoinInfo({ name: snap.data().name })
      } else {
        setError('招待リンクが無効です')
      }
    }
    fetchHousehold()
  }, [joinId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) return
    setSubmitting(true)
    setError('')
    try {
      const hRef = doc(db, 'households', crypto.randomUUID())
      await setDoc(hRef, {
        name: householdName.trim(),
        members: [firebaseUser.uid],
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        householdId: hRef.id,
      })
      router.replace('/food')
    } catch {
      setError('作成に失敗しました。もう一度お試しください')
      setSubmitting(false)
    }
  }

  const handleJoin = async () => {
    if (!firebaseUser || !joinId) return
    setSubmitting(true)
    setError('')
    try {
      await updateDoc(doc(db, 'households', joinId), {
        members: arrayUnion(firebaseUser.uid),
      })
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        householdId: joinId,
      })
      router.replace('/food')
    } catch {
      setError('参加に失敗しました。もう一度お試しください')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-cream">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-forest-500 text-white mb-4 shadow-lg shadow-forest-500/30">
            <Users size={32} weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 font-round">家族グループ設定</h1>
          <p className="text-stone-400 mt-1 text-sm">グループを作るか、招待URLで参加してください</p>
        </div>

        {joinId && joinInfo ? (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
            <p className="text-center text-stone-700 mb-2">
              <span className="font-semibold text-stone-900">「{joinInfo.name}」</span> に招待されています
            </p>
            <p className="text-center text-sm text-stone-400 mb-6">このグループに参加しますか？</p>
            {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-4">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={submitting}
              className="w-full bg-forest-500 hover:bg-forest-600 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {submitting ? '参加中…' : 'グループに参加する'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
            <h2 className="font-semibold text-stone-800 mb-4">新しいグループを作成</h2>
            <form onSubmit={handleCreate} className="space-y-4" noValidate>
              <div>
                <label htmlFor="householdName" className="block text-sm font-medium text-stone-700 mb-1">グループ名</label>
                <input
                  id="householdName"
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="例：田中家"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !householdName.trim()}
                className="w-full bg-forest-500 hover:bg-forest-600 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {submitting ? '作成中…' : 'グループを作成'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SetupContent />
    </Suspense>
  )
}
