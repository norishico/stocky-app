import { ItemStatus } from '@/lib/types'

const config: Record<ItemStatus, { label: string; wrap: string; dot: string }> = {
  '○': { label: '十分',  wrap: 'bg-forest-50 text-forest-600', dot: 'bg-forest-500' },
  '△': { label: '少ない', wrap: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-500'  },
  '×': { label: 'なし',  wrap: 'bg-red-50 text-red-600',      dot: 'bg-red-500'    },
}

export function StatusBadge({ status, size = 'md' }: { status: ItemStatus; size?: 'sm' | 'md' }) {
  const { label, wrap, dot } = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${wrap} ${
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
    }`}>
      <span className={`rounded-full flex-shrink-0 ${dot} ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
      {label}
    </span>
  )
}
