'use client'

import { useEffect, useState, useRef } from 'react'
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
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ShoppingListItem, ShoppingCategory } from '@/lib/types'
import { ShoppingCart, Check, X, CheckCircle, Plus, Trash, Leaf, Package, Lightning, Flag } from '@phosphor-icons/react'

type FilterType = 'all' | 'food' | 'goods'
const FILTER_KEY = 'stocky_shopping_filter'

export default function ShoppingPage() {
  const { household, firebaseUser } = useAuth()
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [directCategory, setDirectCategory] = useState<'food' | 'goods'>('food')
  const [filter, setFilter] = useState<FilterType>('all')
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(FILTER_KEY)
    if (saved === 'food' || saved === 'goods') setFilter(saved)
  }, [])

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
      setItems(snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          category: (data.category ?? 'unknown') as ShoppingCategory,
          oneShot: data.oneShot === true,
        } as ShoppingListItem
      }))
      setLoading(false)
    })
    return () => unsub()
  }, [household?.id])

  const changeFilter = (f: FilterType) => {
    setFilter(f)
    localStorage.setItem(FILTER_KEY, f)
  }

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }

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
        category: directCategory,
        oneShot: false,
      })
    } catch {
      setNewItemName(name)
      showToast('追加に失敗しました')
    }
  }

  const handleToggle = async (item: ShoppingListItem) => {
    if (!household?.id) return
    if (item.itemId && !/^[a-zA-Z0-9_-]{1,128}$/.test(item.itemId)) return
    const hid = household.id
    try {
      if (!item.checked) {
        if (item.itemId && !item.oneShot) {
          await runTransaction(db, async (transaction) => {
            const shoppingRef = doc(db, 'households', hid, 'shoppingList', item.id)
            const itemRef = doc(db, 'households', hid, 'items', item.itemId!)
            transaction.update(shoppingRef, { checked: true })
            transaction.update(itemRef, { status: '○', updatedAt: serverTimestamp() })
          })
          showToast(`「${item.name}」の在庫を「十分あり」に更新しました`)
        } else {
          await updateDoc(doc(db, 'households', hid, 'shoppingList', item.id), { checked: true })
        }
      } else {
        await updateDoc(doc(db, 'households', hid, 'shoppingList', item.id), { checked: false })
      }
    } catch {
      showToast('更新に失敗しました')
    }
  }

  const handleDelete = async (item: ShoppingListItem) => {
    if (!household?.id) return
    try {
      await deleteDoc(doc(db, 'households', household.id, 'shoppingList', item.id))
    } catch {
      showToast('削除に失敗しました')
    }
  }

  const handleClearChecked = async () => {
    if (!household?.id) return
    try {
      await Promise.all(
        items.filter(i => i.checked).map((item) =>
          deleteDoc(doc(db, 'households', household.id, 'shoppingList', item.id))
        )
      )
    } catch {
      showToast('クリアに失敗しました')
    }
  }

  const handleToggleOneShot = async (item: ShoppingListItem) => {
    if (!household?.id) return
    try {
      await updateDoc(doc(db, 'households', household.id, 'shoppingList', item.id), {
        oneShot: !item.oneShot,
      })
    } catch {
      showToast('更新に失敗しました')
    }
  }

  const handleDoneForNow = async () => {
    const uncheckedCount = items.filter(i => !i.checked).length
    if (uncheckedCount > 0) {
      const ok = window.confirm(`まだ${uncheckedCount}件未購入です。今日はここまでにしますか？`)
      if (!ok) return
    }
    await handleClearChecked()
  }

  const filteredItems = filter === 'all' ? items : items.filter(i => i.category === filter)
  const unchecked = filteredItems.filter((i) => !i.checked)
  const checked   = filteredItems.filter((i) => i.checked)
  const allDone   = items.length > 0 && items.every((i) => i.checked)
  const anyChecked = items.some(i => i.checked)

  const allUnchecked   = items.filter(i => !i.checked).length
  const foodUnchecked  = items.filter(i => !i.checked && i.category === 'food').length
  const goodsUnchecked = items.filter(i => !i.checked && i.category === 'goods').length

  const tabs: [FilterType, string, number][] = [
    ['all', '全部', allUnchecked],
    ['food', '食品', foodUnchecked],
    ['goods', '日用品', goodsUnchecked],
  ]

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
      <div className="bg-white rounded-2xl shadow-sm p-3 mb-4 space-y-2.5">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDirectCategory('food')}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              directCategory === 'food'
                ? 'bg-forest-500 text-white'
                : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
            }`}
          >
            <Leaf size={11} weight="fill" />
            食品
          </button>
          <button
            onClick={() => setDirectCategory('goods')}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              directCategory === 'goods'
                ? 'bg-forest-500 text-white'
                : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
            }`}
          >
            <Package size={11} weight="fill" />
            日用品
          </button>
        </div>
      </div>

      {/* カテゴリタブ */}
      {!loading && items.length > 0 && (
        <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-2xl">
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => changeFilter(key)}
              className={`flex-1 text-xs font-semibold py-2 rounded-xl transition-colors ${
                filter === key
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1 ${filter === key ? 'text-forest-500' : ''}`}>{count}</span>
              )}
            </button>
          ))}
        </div>
      )}

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
          {/* 進捗バー（全アイテムベース） */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-stone-700">進捗</span>
              <span className="text-sm font-medium text-stone-400">
                {items.filter(i => i.checked).length} / {items.length}
              </span>
            </div>
            <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-forest-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(items.filter(i => i.checked).length / items.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 全完了バナー */}
          {allDone && (
            <div className="flex items-center justify-between bg-forest-50 border border-forest-200 rounded-2xl px-4 py-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} weight="fill" className="text-forest-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-forest-700">お買い物完了！</span>
              </div>
              <button
                onClick={handleClearChecked}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-400 transition-colors"
              >
                <Trash size={11} />
                クリア
              </button>
            </div>
          )}

          {/* 今日はここまでボタン */}
          {!allDone && anyChecked && (
            <button
              onClick={handleDoneForNow}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 bg-stone-100 hover:bg-stone-200 text-stone-500 font-semibold text-sm rounded-2xl transition-colors"
            >
              <Flag size={15} weight="bold" />
              今日はここまで
            </button>
          )}

          {/* フィルター後が空 */}
          {!allDone && unchecked.length === 0 && checked.length === 0 && (
            <p className="text-center py-10 text-sm text-stone-400">このカテゴリのアイテムはありません</p>
          )}

          <div className="space-y-2.5">
            {unchecked.map((item) => (
              <ShoppingItem
                key={item.id}
                item={item}
                onCheck={handleToggle}
                onDelete={handleDelete}
                onToggleOneShot={handleToggleOneShot}
                showCategory={filter === 'all'}
              />
            ))}
            {checked.length > 0 && (
              <>
                <div className="flex items-center justify-between pt-2 px-1">
                  <p className="text-xs font-medium text-stone-400">購入済み</p>
                  {!allDone && (
                    <button
                      onClick={handleClearChecked}
                      className="text-xs text-stone-300 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash size={11} />
                      クリア
                    </button>
                  )}
                </div>
                {checked.map((item) => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    onCheck={handleToggle}
                    onDelete={handleDelete}
                    checked
                    showCategory={filter === 'all'}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ShoppingItem({
  item,
  onCheck,
  onDelete,
  onToggleOneShot,
  checked = false,
  showCategory = false,
}: {
  item: ShoppingListItem
  onCheck: (item: ShoppingListItem) => void
  onDelete: (item: ShoppingListItem) => void
  onToggleOneShot?: (item: ShoppingListItem) => void
  checked?: boolean
  showCategory?: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 transition-opacity ${checked ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onCheck(item)}
        className={`w-11 h-11 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-forest-500 border-forest-500 text-white'
            : 'border-stone-200 hover:border-forest-400'
        }`}
        aria-label="購入済みにする"
      >
        {checked && <Check size={16} weight="bold" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-medium text-stone-900 ${checked ? 'line-through text-stone-400' : ''}`}>
            {item.name}
          </span>
          {item.oneShot && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">
              <Lightning size={9} weight="fill" />
              単発
            </span>
          )}
          {showCategory && item.category !== 'unknown' && (
            <span className={`text-xs font-medium ${
              item.category === 'food' ? 'text-forest-500' : 'text-amber-500'
            }`}>
              {item.category === 'food' ? '食品' : '日用品'}
            </span>
          )}
        </div>
      </div>
      {!checked && onToggleOneShot && (
        <button
          onClick={() => onToggleOneShot(item)}
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            item.oneShot
              ? 'text-amber-400 bg-amber-50'
              : 'text-stone-200 hover:text-amber-300 hover:bg-amber-50'
          }`}
          aria-label={item.oneShot ? '在庫に反映する' : '在庫に反映しない（単発）'}
        >
          <Lightning size={15} weight="fill" />
        </button>
      )}
      <button
        onClick={() => onDelete(item)}
        className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
        aria-label="リストから削除"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  )
}
