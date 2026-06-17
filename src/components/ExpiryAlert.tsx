'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { X, Clock } from '@phosphor-icons/react'

export function ExpiryAlert() {
  const { expiringItems } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  if (!expiringItems.length || dismissed) return null

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="mx-4 mt-3 mb-1 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
            <Clock size={13} weight="fill" />
            期限まもなくの食品
          </p>
          <ul className="space-y-0.5">
            {expiringItems.map((item) => {
              const isExpired = item.expiryDate! < todayStr
              const isToday = item.expiryDate === todayStr
              return (
                <li key={item.id} className="text-xs text-amber-800 truncate">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-amber-600 ml-1">
                    {isExpired ? '— 期限切れ' : isToday ? '— 今日が期限' : `— ${item.expiryDate}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1.5 -mr-1 -mt-0.5 text-amber-400 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
          aria-label="閉じる"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
