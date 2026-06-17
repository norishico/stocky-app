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
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ShoppingListItem } from '@/lib/types'
import { ShoppingCart, Check, X, CheckCircle, Plus, Trash } from '@phosphor-icons/react'
import { useRef } from 'react'

export default function ShoppingPage() {
  const { household, firebaseUser } = useAuth()
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

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

  const handleAddDirect = async () => {
    if (!household?.id || !firebaseUser || !newItemName.trim()) return
    const name = newItemName.trim()
    setNewItemName('')
    try {
      await addDoc(collection(db, 'households', household.id, 'shoppingList'), {
        itemId: null,
        name,
        imageUrl: null,
        addedAt: serverTimestamp(),
        addedBy: firebaseUser.uid,
        checked: false,
      })
    } catch {
      // ignore
    }
  }

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }

  const handleToggle = async (item: ShoppingListItem) => {
    if (!household?.id) return
    try {
      if (!item.checked) {
        if (item.itemId) {
          await updateDoc(doc(db, 'households', household.id, 'items', item.itemId), {
            status: '○',
            updatedAt: serverTimestamp(),
          })
          showToast(`「${item.name}」の在庫を「十分あり」に更新しました`)
        }
        await updateDoc(doc(db, 'households', household.id, 'shoppingList', item.id), {
          checked: true,
        })
      } else {
        await updateDoc(doc(db, 'households', household.id, 'shoppingList', item.id), {
          checked: false,
        })
      }
    } catch {
      // ignore
    }
  }

  const handleDelete = async (item: ShoppingListItem) => {
    if (!household?.id) return
    try {
      await deleteDoc(doc(db, 'households', household.id, 'shoppingList', item.id))
    } catch {
      // ignore
    }
  }

  const handleClearChecked = async () => {
    if (!household?.id) return
    try {
      await Promise.all(
        checked.map((item) => deleteDoc(doc(db, 'households', household.id, 'shoppingList', item.id)))
      )
    } catch {
      // ignore
    }
  }

  const unchecked = items.filter((i) => !i.checked)
  const checked   = items.filter((i) => i.checked)
  const allDone   = items.length > 0 && unchecked.length === 0

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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <ShoppingCart size={22} weight="fill" className="text-forest-500" />
          買い物リスト
        </h1>
        <span className="text-sm text-stone-400">{unchecked.length}件</span>
      </div>

      {/* 直接追加フォーム */}
      <div className="bg-white rounded-2xl shadow-sm p-3 mb-4 flex items-center gap-2">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddDirect() }}
          placeholder="アイテムを入力して追加…"
          className="flex-1 text-base focus:outline-none bg-transparent placeholder:text-stone-300"
        />
        <button
          onClick={handleAddDirect}
          disabled={!newItemName.trim()}
          className="w-9 h-9 flex-shrink-0 bg-forest-500 disabled:bg-stone-200 text-white rounded-xl flex items-center justify-center transition-colors"
          aria-label="追加"
        >
          <Plus size={16} weight="bold" />
        </button>
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
          <p className="text-sm text-stone-400 mt-1">上の入力欄またはアイテム詳細から追加できます</p>
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
              <button
                onClick={handleClearChecked}
                className="mt-6 flex items-center gap-1.5 text-sm text-stone-400 hover:text-red-400 transition-colors"
              >
                <Trash size={14} />
                リストをクリア
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {unchecked.map((item) => (
                <ShoppingItem key={item.id} item={item} onCheck={handleToggle} onDelete={handleDelete} />
              ))}
              {checked.length > 0 && (
                <>
                  <div className="flex items-center justify-between pt-2 px-1">
                    <p className="text-xs font-medium text-stone-400">購入済み</p>
                    <button
                      onClick={handleClearChecked}
                      className="text-xs text-stone-300 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash size={11} />
                      クリア
                    </button>
                  </div>
                  {checked.map((item) => (
                    <ShoppingItem key={item.id} item={item} onCheck={handleToggle} onDelete={handleDelete} checked />
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
