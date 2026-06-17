import Link from 'next/link'
import Image from 'next/image'
import { Item, ItemStatus } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { Leaf, Package } from '@phosphor-icons/react'

const STATUS_CARD: Record<ItemStatus, string> = {
  '○': 'bg-white',
  '△': 'bg-amber-50',
  '×': 'bg-red-50',
}

function getExpiryBorder(expiryDate?: string) {
  if (!expiryDate) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((new Date(expiryDate).getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'border-l-4 border-red-400'
  if (diff <= 3) return 'border-l-4 border-amber-400'
  return ''
}

function formatExpiry(expiryDate?: string, expiryType?: string) {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((new Date(expiryDate).getTime() - today.getTime()) / 86400000)
  const label = expiryType ?? '期限'
  if (diff < 0) return { text: `${label}切れ`, color: 'text-red-500' }
  if (diff === 0) return { text: `${label}：今日`, color: 'text-red-500' }
  if (diff <= 3) return { text: `${label}：あと${diff}日`, color: 'text-amber-600' }
  return { text: `${label}：${expiryDate}`, color: 'text-stone-400' }
}

export function ItemCard({ item }: { item: Item }) {
  const expiry = formatExpiry(item.expiryDate, item.expiryType)
  const borderColor = getExpiryBorder(item.expiryDate)
  const cardBg = STATUS_CARD[item.status]

  return (
    <Link href={`/item/${item.id}`}>
      <div className={`rounded-2xl shadow-sm p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform ${cardBg} ${borderColor}`}>
        {item.imageUrl ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
            <Image src={item.imageUrl} alt={item.name} width={56} height={56} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center ${
            item.category === 'food' ? 'bg-forest-50 text-forest-400' : 'bg-stone-100 text-stone-400'
          }`}>
            {item.category === 'food'
              ? <Leaf size={28} weight="duotone" />
              : <Package size={28} weight="duotone" />
            }
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-900 truncate">{item.name}</p>
          {item.brand && <p className="text-xs text-stone-400 truncate">{item.brand}</p>}
          {expiry ? (
            <p className={`text-xs mt-0.5 font-medium ${expiry.color}`}>{expiry.text}</p>
          ) : item.storageLocation ? (
            <p className="text-xs text-stone-400">{item.storageLocation}</p>
          ) : null}
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={item.status} size="sm" />
        </div>
      </div>
    </Link>
  )
}
