'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Item } from '@/lib/types'
import { ItemCard } from '@/components/ItemCard'
import { Package } from '@phosphor-icons/react'

const STATUS_ORDER = { '×': 0, '△': 1, '○': 2 }

export default function GoodsPage() {
  const { household } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household?.id) return
    const q = query(
      collection(db, 'households', household.id, 'items'),
      where('category', '==', 'goods'),
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Item))
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, 'ja'))
      setItems(data)
      setLoading(false)
    })
    return () => unsub()
  }, [household?.id])

  const outCount  = items.filter((i) => i.status === '×').length
  const lowCount  = items.filter((i) => i.status === '△').length
  const fullCount = items.filter((i) => i.status === '○').length

  return (
    <div className="px-4 pt-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Package size={22} weight="fill" className="text-forest-500" />
          日用品
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
          <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
            <Package size={40} weight="thin" className="text-stone-300" />
          </div>
          <p className="font-semibold text-stone-600">日用品がまだありません</p>
          <p className="text-sm text-stone-400 mt-1 leading-relaxed">
            ＋ボタンを押してバーコードを<br />スキャンしてみましょう
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
