'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function RootPage() {
  const { firebaseUser, userDoc, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!firebaseUser) {
      router.replace('/login')
    } else if (!userDoc?.householdId) {
      router.replace('/setup')
    } else {
      router.replace('/food')
    }
  }, [loading, firebaseUser, userDoc, router])

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
