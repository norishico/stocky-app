'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Item, ItemStatus, StorageLocation, ExpiryType } from '@/lib/types'
import { ArrowLeft, ShoppingCart, Trash } from '@phosphor-icons/react'

const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: '○', label: '十分' },
  { value: '△', label: '少ない' },
  { value: '×', label: 'なし' },
]
const STORAGE_LOCATIONS: StorageLocation[] = ['冷蔵', '冷凍', '常温']
const EXPIRY_TYPES: ExpiryType[] = ['賞味', '消費']

const STATUS_ACTIVE: Record<ItemStatus, string> = {
  '○': 'bg-forest-50 border-forest-500 text-forest-500',
  '△': 'bg-amber-50 border-amber-500 text-amber-500',
  '×': 'bg-red-50 border-red-400 text-red-500',
}

export default function ItemDetailPage() {
  const { household, firebaseUser } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingToList, setAddingToList] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [status, setStatus] = useState<ItemStatus>('○')
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryType, setExpiryType] = useState<ExpiryType>('賞味')
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('冷蔵')
  const [memo, setMemo] = useState('')

  // リアルタイム更新：itemステートのみ更新（フォーム値は別effectで管理）
  useEffect(() => {
    if (!household?.id) return
    const unsub = onSnapshot(doc(db, 'households', household.id, 'items', id), (snap) => {
      if (snap.exists()) setItem({ id: snap.id, ...snap.data() } as Item)
      setLoading(false)
    })
    return () => unsub()
  }, [household?.id, id])

  // 表示モード時 or itemが更新されたときにフォーム値をリセット（キャンセル対応も兼ねる）
  useEffect(() => {
    if (!item || editing) return
    setName(item.name)
    setBrand(item.brand ?? '')
    setStatus(item.status)
    setExpiryDate(item.expiryDate ?? '')
    setExpiryType(item.expiryType ?? '賞味')
    setStorageLocation(item.storageLocation ?? '冷蔵')
    setMemo(item.memo ?? '')
  }, [item, editing])

  const handleStatusChange = async (newStatus: ItemStatus) => {
    if (!household?.id || !item) return
    setStatus(newStatus)
    setItem((prev) => prev && { ...prev, status: newStatus })
    try {
      await updateDoc(doc(db, 'households', household.id, 'items', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
    } catch {
      setError('ステータスの更新に失敗しました')
    }
  }

  const handleSave = async () => {
    if (!household?.id || !item) return
    setSaving(true)
    setError('')
    try {
      await updateDoc(doc(db, 'households', household.id, 'items', id), {
        name: name.trim(),
        brand: brand.trim() || null,
        status,
        expiryDate: expiryDate || null,
        expiryType: expiryDate ? expiryType : null,
        storageLocation: item.category === 'food' ? storageLocation : null,
        memo: memo.trim() || null,
        updatedAt: serverTimestamp(),
      })
      setItem((prev) =>
        prev
          ? {
              ...prev,
              name: name.trim(),
              brand: brand.trim() || undefined,
              status,
              expiryDate: expiryDate || undefined,
              expiryType: expiryDate ? expiryType : undefined,
              storageLocation,
              memo: memo.trim() || undefined,
            }
          : prev,
      )
      setEditing(false)
    } catch {
      setError('保存に失敗しました。もう一度お試しください')
    } finally {
      setSaving(false)
    }
  }

  const handleAddToShoppingList = async () => {
    if (!household?.id || !firebaseUser || !item) return
    setAddingToList(true)
    setError('')
    try {
      const listRef = doc(db, 'households', household.id, 'shoppingList', id)
      await setDoc(listRef, {
        itemId: id,
        name: item.name,
        imageUrl: item.imageUrl ?? null,
        addedAt: serverTimestamp(),
        addedBy: firebaseUser.uid,
        checked: false,
      })
      router.push('/shopping')
    } catch {
      setError('買い物リストへの追加に失敗しました')
    } finally {
      setAddingToList(false)
    }
  }

  const handleDelete = () => {
    setConfirmDelete(true)
  }

  const doDelete = async () => {
    if (!household?.id) return
    setConfirmDelete(false)
    try {
      await deleteDoc(doc(db, 'households', household.id, 'items', id))
      router.back()
    } catch {
      setError('削除に失敗しました。もう一度お試しください')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh text-stone-400 gap-2">
        <p className="text-4xl">🤔</p>
        <p>アイテムが見つかりません</p>
        <button onClick={() => router.back()} className="text-forest-500 text-sm mt-2">戻る</button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-cream max-w-md mx-auto">
      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center px-4 pb-8">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <p className="font-semibold text-stone-900 text-center mb-1">「{item.name}」を削除しますか？</p>
            <p className="text-sm text-stone-400 text-center mb-6">この操作は元に戻せません</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-xl border-2 border-stone-200 text-stone-600 font-semibold"
              >
                キャンセル
              </button>
              <button
                onClick={doDelete}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
          aria-label="戻る"
        >
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className="font-bold text-stone-900 text-lg truncate max-w-[200px]">{item.name}</h1>
        {editing ? (
          <button
            onClick={() => { setEditing(false); setError('') }}
            className="text-sm font-medium px-3 py-1.5 rounded-xl text-red-400 hover:bg-red-50 transition-colors"
          >
            キャンセル
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors"
          >
            編集
          </button>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        {item.imageUrl && (
          <div className="flex justify-center">
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={120}
              height={120}
              className="rounded-2xl object-cover"
            />
          </div>
        )}

        {/* ステータス選択 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">在庫ステータス</p>
          <div className="flex gap-2">
            {STATUSES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleStatusChange(value)}
                aria-pressed={status === value}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  status === value ? STATUS_ACTIVE[value] : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                <div className="text-xl font-bold">{value}</div>
                <div className="text-[11px] mt-0.5">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
        )}

        {editing ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">詳細を編集</p>
            <div>
              <label htmlFor="editName" className="block text-sm font-medium text-stone-700 mb-1">商品名</label>
              <input
                id="editName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="editBrand" className="block text-sm font-medium text-stone-700 mb-1">ブランド</label>
              <input
                id="editBrand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>
            {item.category === 'food' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">保管場所</label>
                  <div className="flex gap-2">
                    {STORAGE_LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setStorageLocation(loc)}
                        className={`flex-1 py-2 rounded-xl text-sm border-2 transition-all ${
                          storageLocation === loc
                            ? 'bg-forest-50 border-forest-500 text-forest-500 font-medium'
                            : 'bg-white border-stone-200 text-stone-400'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">期限日</label>
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      {EXPIRY_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setExpiryType(t)}
                          className={`px-3 py-2 rounded-xl text-sm border-2 transition-all ${
                            expiryType === t
                              ? 'bg-forest-50 border-forest-500 text-forest-500 font-medium'
                              : 'bg-white border-stone-200 text-stone-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <label htmlFor="editMemo" className="block text-sm font-medium text-stone-700 mb-1">メモ</label>
              <textarea
                id="editMemo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="w-full bg-forest-500 hover:bg-forest-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? '保存中…' : '変更を保存'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">詳細</p>
            {item.brand && (
              <div className="flex justify-between">
                <span className="text-sm text-stone-500">ブランド</span>
                <span className="text-sm font-medium text-stone-900">{item.brand}</span>
              </div>
            )}
            {item.category === 'food' && item.storageLocation && (
              <div className="flex justify-between">
                <span className="text-sm text-stone-500">保管場所</span>
                <span className="text-sm font-medium text-stone-900">{item.storageLocation}</span>
              </div>
            )}
            {item.expiryDate && (
              <div className="flex justify-between">
                <span className="text-sm text-stone-500">{item.expiryType ?? '期限'}日</span>
                <span className="text-sm font-medium text-stone-900">{item.expiryDate}</span>
              </div>
            )}
            {item.memo && (
              <div>
                <span className="text-sm text-stone-500 block mb-1">メモ</span>
                <p className="text-sm text-stone-900 bg-stone-50 rounded-lg px-3 py-2">{item.memo}</p>
              </div>
            )}
            {!item.brand && !item.expiryDate && !item.memo && !item.storageLocation && (
              <p className="text-sm text-stone-400">詳細情報なし</p>
            )}
          </div>
        )}

        <button
          onClick={handleAddToShoppingList}
          disabled={addingToList}
          className="w-full bg-white border-2 border-forest-500 text-forest-500 font-semibold py-3.5 rounded-2xl hover:bg-forest-50 transition-colors disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
        >
          <ShoppingCart size={18} weight="bold" />
          {addingToList ? '追加中…' : '買い物リストに追加'}
        </button>

        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-1.5 text-red-400 text-sm font-medium py-2 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash size={15} />
          このアイテムを削除
        </button>
      </div>
    </div>
  )
}
