'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { UserDoc, Household, Item } from '@/lib/types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  userDoc: UserDoc | null
  household: Household | null
  expiringItems: Item[]
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [expiringItems, setExpiringItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // Auth state → user doc (onSnapshot for reactivity)
  useEffect(() => {
    let unsubUser: (() => void) | null = null
    let cancelled = false

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (cancelled) return
      setFirebaseUser(fbUser)

      if (unsubUser) { unsubUser(); unsubUser = null }

      if (!fbUser) {
        setUserDoc(null)
        setHousehold(null)
        setExpiringItems([])
        setLoading(false)
        return
      }

      const userRef = doc(db, 'users', fbUser.uid)
      unsubUser = onSnapshot(userRef, (snap) => {
        if (cancelled) return
        setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null)
        setLoading(false)
      })
    })

    return () => {
      cancelled = true
      unsubAuth()
      if (unsubUser) unsubUser()
    }
  }, [])

  // userDoc.householdId → household (onSnapshot)
  useEffect(() => {
    if (!userDoc?.householdId) {
      setHousehold(null)
      return
    }
    const hRef = doc(db, 'households', userDoc.householdId)
    const unsub = onSnapshot(hRef, (snap) => {
      if (snap.exists()) {
        setHousehold({ id: snap.id, ...snap.data() } as Household)
      }
    })
    return () => unsub()
  }, [userDoc?.householdId])

  // userDoc.householdId → expiring food items (shared, avoids duplicate listeners)
  useEffect(() => {
    if (!userDoc?.householdId) {
      setExpiringItems([])
      return
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limitDate = new Date(today)
    limitDate.setDate(today.getDate() + 3)
    const limitStr = limitDate.toISOString().split('T')[0]

    const q = query(
      collection(db, 'households', userDoc.householdId, 'items'),
      where('category', '==', 'food'),
      where('expiryDate', '<=', limitStr),
    )
    const unsub = onSnapshot(q, (snap) => {
      setExpiringItems(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Item))
          .filter(item => !!item.expiryDate)
          .sort((a, b) => (a.expiryDate! > b.expiryDate! ? 1 : -1))
      )
    })
    return () => unsub()
  }, [userDoc?.householdId])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      name,
    })
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUserDoc(null)
    setHousehold(null)
    setExpiringItems([])
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, userDoc, household, expiringItems, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
