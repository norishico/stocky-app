'use client'

import { useEffect, useState, useRef } from 'react'
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Item } from '@/lib/types'
import { ItemCard } from '@/components/ItemCard'
import { Leaf } from '@phosphor-icons/react'

const STATUS_ORDER = { '×': 0, '△': 1, '○': 2 }

export default function FoodPage() {
  const { household, firebaseUser } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  useEffect(() => {
    if (!household?.id) return
    const q = query(
      collection(db, 'households', household.id, 'items'),
      where('category', '==', 'food'),
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Item))
        .sort((a, b) => {
          const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
          if (statusDiff !== 0) return statusDiff
          if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate)
          if (a.expiryDate) return -1
          if (b.expiryDate) return 1
          return a.name.localeCompare(b.name, 'ja')
        })
      setItems(data)
      setLoading(false)
    })
    return () => unsub()
  }, [household?.id])

  const handleAddToCart = async (item: Item) => {
    if (!household?.id || !firebaseUser) return
    try {
      await addDoc(collection(db, 'households', household.id, 'shoppingList'), {
        itemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl ?? null,
        addedAt: serverTimestamp(),
        addedBy: firebaseUser.uid,
        checked: false,
        category: item.category,
        oneShot: false,
      })
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setToast(`「${item.name}」を買い物リストに追加しました`)
      toastTimer.current = setTimeout(() => setToast(''), 2500)
    } catch {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setToast('追加に失敗しました')
      toastTimer.current = setTimeout(() => setToast(''), 2500)
    }
  }

  const outCount  = items.filter((i) => i.status === '×').length
  const lowCount  = items.filter((i) => i.status === '△').length
  const fullCount = items.filter((i) => i.status === '○').length

  return (
    <div className="px-4 pt-4">
      {/* トースト通知 */}
      <div className={`fixed top-4 inset-x-4 mx-auto max-w-sm z-[100] transition-all duration-300 ${
        toast ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}>
        <div className="bg-stone-800/90 backdrop-blur-sm text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-lg text-center">
          {toast}
        </div>
      </div>

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Leaf size={22} weight="fill" className="text-forest-500" />
          食品
        </h1>
        <span className="text-sm text-stone-400">{items.length}件</span>
      </div>

      {/* 在庫サマリー */}
      {!loading && items.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {outCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              なし {outCount}件
            </span>
          )}
          {lowCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              少ない {lowCount}件
            </span>
          )}
          {outCount === 0 && lowCount === 0 && fullCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-forest-50 text-forest-600 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-forest-500 rounded-full" />
              すべて在庫あり
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
          <div className="w-20 h-20 rounded-3xl bg-forest-50 flex items-center justify-center mb-4">
            <Leaf size={40} weight="thin" className="text-forest-300" />
          </div>
          <p className="font-semibold text-stone-600">食品がまだありません</p>
          <p className="text-sm text-stone-400 mt-1 leading-relaxed">
            ＋ボタンを押してバーコードを<br />スキャンしてみましょう
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onAddToCart={handleAddToCart} />
          ))}
        </div>
      )}
    </div>
  )
}
