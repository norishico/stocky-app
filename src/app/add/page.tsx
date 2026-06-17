'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import dynamic from 'next/dynamic'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ItemCategory, ItemStatus, StorageLocation, ExpiryType } from '@/lib/types'
import Image from 'next/image'
import { ArrowLeft, Camera } from '@phosphor-icons/react'

const Scanner = dynamic(() => import('@/components/Scanner').then((m) => m.Scanner), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

const STORAGE_LOCATIONS: StorageLocation[] = ['冷蔵', '冷凍', '常温']
const EXPIRY_TYPES: ExpiryType[] = ['賞味', '消費']
const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: '○', label: '十分にある' },
  { value: '△', label: '少ない' },
  { value: '×', label: 'ない・切れた' },
]

const STATUS_ACTIVE: Record<ItemStatus, string> = {
  '○': 'bg-forest-50 border-forest-500 text-forest-500',
  '△': 'bg-amber-50 border-amber-500 text-amber-500',
  '×': 'bg-red-50 border-red-400 text-red-500',
}

function AddContent() {
  const { firebaseUser, household } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initCategory = (searchParams.get('category') as ItemCategory) ?? 'food'

  const [showScanner, setShowScanner] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [scanNotFound, setScanNotFound] = useState(false)

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<ItemCategory>(initCategory)
  const [status, setStatus] = useState<ItemStatus>('○')
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryType, setExpiryType] = useState<ExpiryType>('賞味')
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('冷蔵')
  const [memo, setMemo] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [barcode, setBarcode] = useState('')

  const handleScan = useCallback(
    async (code: string) => {
      setShowScanner(false)
      setBarcode(code)
      setFetching(true)
      setScanNotFound(false)
      try {
        const res = await fetch(`/api/barcode?code=${code}`)
        if (res.ok) {
          const data = await res.json()
          if (data.name) setName(data.name)
          if (data.brand) setBrand(data.brand)
          if (data.imageUrl) setImageUrl(data.imageUrl)
        } else {
          setScanNotFound(true)
        }
      } catch {
        setScanNotFound(true)
      } finally {
        setFetching(false)
      }
    },
    [],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!household?.id || !firebaseUser) return
    setSubmitting(true)
    setError('')
    try {
      const base = {
        name: name.trim(),
        brand: brand.trim() || null,
        category,
        status,
        barcode: barcode || null,
        imageUrl: imageUrl || null,
        memo: memo.trim() || null,
        addedBy: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      }
      const foodExtra =
        category === 'food'
          ? {
              expiryDate: expiryDate || null,
              expiryType: expiryDate ? expiryType : null,
              storageLocation,
            }
          : {}
      await addDoc(collection(db, 'households', household.id, 'items'), {
        ...base,
        ...foodExtra,
      })
      router.back()
    } catch {
      setError('保存に失敗しました。もう一度お試しください')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-cream max-w-md mx-auto">
      {showScanner && (
        <Scanner onResult={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
          aria-label="戻る"
        >
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className="font-bold text-stone-900 text-lg">アイテムを追加</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5" noValidate>
        {/* カテゴリ */}
        <div className="flex bg-stone-100 rounded-xl p-1">
          {(['food', 'goods'] as ItemCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                category === c ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'
              }`}
            >
              {c === 'food' ? '食品' : '日用品'}
            </button>
          ))}
        </div>

        {/* バーコードスキャン */}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-forest-500/40 bg-forest-50 text-forest-500 rounded-2xl py-4 font-medium text-sm transition-colors hover:bg-forest-100"
        >
          <Camera size={18} weight="bold" />
          バーコードをスキャン
        </button>

        {fetching && (
          <p className="text-center text-sm text-forest-500 animate-pulse">商品情報を取得中…</p>
        )}

        {scanNotFound && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-amber-700">商品情報が見つかりませんでした</p>
            <p className="text-xs text-amber-600 mt-0.5">商品名を直接入力してください</p>
          </div>
        )}

        {imageUrl && (
          <div className="flex justify-center">
            <Image src={imageUrl} alt="商品画像" width={80} height={80} className="rounded-xl object-cover" />
          </div>
        )}

        {/* 商品名 */}
        <div>
          <label htmlFor="itemName" className="block text-sm font-medium text-stone-700 mb-1">
            商品名 <span className="text-red-500">*</span>
          </label>
          <input
            id="itemName"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setScanNotFound(false) }}
            placeholder="例：牛乳"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            required
          />
        </div>

        {/* ブランド */}
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-stone-700 mb-1">ブランド・メーカー</label>
          <input
            id="brand"
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="例：明治"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
          />
        </div>

        {/* 在庫ステータス */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">在庫ステータス</label>
          <div className="flex gap-2">
            {STATUSES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                aria-pressed={status === value}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  status === value ? STATUS_ACTIVE[value] : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                <div className="text-base font-bold">{value}</div>
                <div className="text-[10px] mt-0.5">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 食品のみ */}
        {category === 'food' && (
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
              <label className="block text-sm font-medium text-stone-700 mb-1">期限日（任意）</label>
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

        {/* メモ */}
        <div>
          <label htmlFor="memo" className="block text-sm font-medium text-stone-700 mb-1">メモ</label>
          <textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモを追加…"
            rows={2}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full bg-forest-500 hover:bg-forest-600 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-60 text-base"
        >
          {submitting ? '保存中…' : '保存する'}
        </button>
      </form>
    </div>
  )
}

export default function AddPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AddContent />
    </Suspense>
  )
}
