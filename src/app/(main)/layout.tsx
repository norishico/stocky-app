'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { BottomNav } from '@/components/BottomNav'
import { ExpiryAlert } from '@/components/ExpiryAlert'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, userDoc, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!firebaseUser) { router.replace('/login'); return }
    if (!userDoc?.householdId) { router.replace('/setup'); return }
  }, [loading, firebaseUser, userDoc, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-md mx-auto">
      <ExpiryAlert />
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
    </div>
  )
}
