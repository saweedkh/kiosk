'use client'

import { useEffect, useState } from 'react'
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
  const { accessToken, user, hasHydrated } = useAuthStore()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    const finish = () => {
      if (!useAuthStore.getState().hasHydrated) {
        useAuthStore.setState({ hasHydrated: true })
      }
    }

    if (useAuthStore.persist.hasHydrated()) {
      finish()
    }

    const unsub = useAuthStore.persist.onFinishHydration(finish)
    // Fallback if persist stalls (blocked storage / failed rehydrate)
    const timeout = window.setTimeout(finish, 300)

    return () => {
      unsub()
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!isMounted || !hasHydrated) return

    const timer = window.setTimeout(() => {
      if (!hasStaffAccess()) {
        window.location.replace(redirectTo)
      }
    }, 100)

    return () => window.clearTimeout(timer)
  }, [isMounted, hasHydrated, accessToken, user, redirectTo])

  if (!isMounted || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary dark:text-gray-400">
            در حال بررسی دسترسی...
          </p>
        </div>
      </div>
    )
  }

  if (!hasStaffAccess()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary dark:text-gray-400">
            در حال هدایت به صفحه ورود...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
