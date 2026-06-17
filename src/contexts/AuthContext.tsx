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
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { UserDoc, Household } from '@/lib/types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  userDoc: UserDoc | null
  household: Household | null
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (cancelled) return
      setFirebaseUser(fbUser)
      if (!fbUser) {
        setUserDoc(null)
        setHousehold(null)
        setLoading(false)
        return
      }

      const userRef = doc(db, 'users', fbUser.uid)
      const userSnap = await getDoc(userRef)
      if (cancelled) return
      if (userSnap.exists()) {
        const data = userSnap.data() as UserDoc
        setUserDoc(data)
        if (data.householdId) {
          const hRef = doc(db, 'households', data.householdId)
          const hSnap = await getDoc(hRef)
          if (cancelled) return
          if (hSnap.exists()) {
            setHousehold({ id: hSnap.id, ...hSnap.data() } as Household)
          }
        }
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
      unsubAuth()
    }
  }, [])

  useEffect(() => {
    if (!userDoc?.householdId) return
    const hRef = doc(db, 'households', userDoc.householdId)
    const unsub = onSnapshot(hRef, (snap) => {
      if (snap.exists()) {
        setHousehold({ id: snap.id, ...snap.data() } as Household)
      }
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
    setUserDoc({ uid: cred.user.uid, email, name })
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUserDoc(null)
    setHousehold(null)
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, userDoc, household, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
