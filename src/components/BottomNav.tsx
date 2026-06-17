'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, Package, ShoppingCart, Plus, GearSix } from '@phosphor-icons/react'

const tabs = [
  { href: '/food',     label: '食品',   Icon: Leaf         },
  { href: '/goods',    label: '日用品',  Icon: Package      },
  { href: '/shopping', label: '買い物',  Icon: ShoppingCart },
  { href: '/settings', label: '設定',    Icon: GearSix      },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-stone-100 pb-safe">
      <div className="flex items-center max-w-md mx-auto">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 py-3 flex-1 min-h-[56px] justify-center transition-colors ${
                active ? 'text-forest-500' : 'text-stone-400'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-forest-500 rounded-full" />
              )}
              <Icon size={24} weight={active ? 'fill' : 'regular'} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <Link
          href="/add"
          className="flex flex-col items-center gap-1 py-3 flex-1 min-h-[56px] justify-center text-forest-500"
        >
          <span className="w-11 h-11 flex items-center justify-center bg-forest-500 text-white rounded-full shadow-md">
            <Plus size={22} weight="bold" />
          </span>
          <span className="text-[10px] font-medium">追加</span>
        </Link>
      </div>
    </nav>
  )
}
