'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

function hasStaffAccess(): boolean {
  const { accessToken, user } = useAuthStore.getState()
  if (accessToken && user) {
    return user.is_staff !== false
  }
  try {
    const stored = localStorage.getItem('auth-storage')
    if (!stored) return false
    const parsed = JSON.parse(stored)
    const state = parsed?.state
    if (!state?.accessToken) return false
    const storedUser = state.user
    if (storedUser && storedUser.is_staff === false) return false
    return true
  } catch {
    return false
  }
}

export function ProtectedRoute({
  children,
  redirectTo = '/admin/login',
}: ProtectedRouteProps) {
  const router = useRouter()
  const { accessToken, user, hasHydrated } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const finish = () => {
      if (!useAuthStore.getState().hasHydrated) {
        useAuthStore.setState({ hasHydrated: true })
      }
    }

    if (useAuthStore.persist.hasHydrated()) {
      finish()
    }

    const unsub = useAuthStore.persist.onFinishHydration(finish)
    const timeout = window.setTimeout(finish, 300)

    return () => {
      unsub()
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!hasHydrated && hasStaffAccess()) return
    if (!hasHydrated) return

    if (!hasStaffAccess()) {
      router.replace(redirectTo)
    }
  }, [mounted, hasHydrated, accessToken, user, redirectTo, router])

  if (!mounted) {
    return null
  }

  if (hasStaffAccess()) {
    return <>{children}</>
  }

  if (!hasHydrated) {
    return null
  }

  return null
}
