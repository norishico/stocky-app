'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ShoppingListItem } from '@/lib/types'
import { ShoppingCart, Check, X, CheckCircle } from '@phosphor-icons/react'

export default function ShoppingPage() {
  const { household } = useAuth()
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household?.id) return
    const q = query(
      collection(db, 'households', household.id, 'shoppingList'),
      orderBy('addedAt', 'asc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShoppingListItem)))
      setLoading(false)
    })
    return () => unsub()
  }, [household?.id])

  const handleCheck = async (item: ShoppingListItem) => {
    if (!household?.id) return
    try {
      await updateDoc(doc(db, 'households', household.id, 'items', item.itemId), {
        status: '○',
        quantity: null,
        updatedAt: serverTimestamp(),
      })
      // 削除せず checked: true にする — 購入済みセクションに移動し、完了状態を検知できる
      await updateDoc(doc(db, 'households', household.id, 'shoppingList', item.id), {
        checked: true,
      })
    } catch {
      // Firestore のオフラインキューが再試行するため無視
    }
  }

  const handleDelete = async (item: ShoppingListItem) => {
    if (!household?.id) return
    try {
      await deleteDoc(doc(db, 'households', household.id, 'shoppingList', item.id))
    } catch {
      // 無視
    }
  }

  const unchecked = items.filter((i) => !i.checked)
  const checked   = items.filter((i) => i.checked)
  const allDone   = items.length > 0 && unchecked.length === 0

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <ShoppingCart size={22} weight="fill" className="text-forest-500" />
          買い物リスト
        </h1>
        <span className="text-sm text-stone-400">{unchecked.length}件</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
          <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
            <ShoppingCart size={40} weight="thin" className="text-stone-300" />
          </div>
          <p className="font-semibold text-stone-600">買い物リストは空です</p>
          <p className="text-sm text-stone-400 mt-1">アイテム詳細から追加できます</p>
        </div>
      ) : (
        <>
          {/* 進捗バー */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-stone-700">進捗</span>
              <span className="text-sm font-medium text-stone-400">{checked.length} / {items.length}</span>
            </div>
            <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-forest-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(checked.length / items.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 全完了ステート */}
          {allDone ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="w-20 h-20 bg-forest-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={44} weight="fill" className="text-forest-500" />
              </div>
              <p className="font-bold text-stone-800 text-xl">お買い物完了！</p>
              <p className="text-sm text-stone-400 mt-1">すべての商品を購入しました</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {unchecked.map((item) => (
                <ShoppingItem key={item.id} item={item} onCheck={handleCheck} onDelete={handleDelete} />
              ))}
              {checked.length > 0 && (
                <>
                  <p className="text-xs font-medium text-stone-400 pt-2 px-1">購入済み</p>
                  {checked.map((item) => (
                    <ShoppingItem key={item.id} item={item} onCheck={handleCheck} onDelete={handleDelete} checked />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ShoppingItem({
  item,
  onCheck,
  onDelete,
  checked = false,
}: {
  item: ShoppingListItem
  onCheck: (item: ShoppingListItem) => void
  onDelete: (item: ShoppingListItem) => void
  checked?: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 transition-opacity ${checked ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onCheck(item)}
        className={`w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-forest-500 border-forest-500 text-white'
            : 'border-stone-200 hover:border-forest-400'
        }`}
        aria-label="購入済みにする"
      >
        {checked && <Check size={14} weight="bold" />}
      </button>
      <span className={`flex-1 font-medium text-stone-900 ${checked ? 'line-through text-stone-400' : ''}`}>
        {item.name}
      </span>
      <button
        onClick={() => onDelete(item)}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
        aria-label="リストから削除"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  )
}
