'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  redirectTo = '/admin/login',
}: ProtectedRouteProps) {
  const { accessToken } = useAuthStore()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    // Check auth after mount
    const checkAndRedirect = () => {
      // Check Zustand store first
      if (accessToken) {
        return // Has token, allow access
      }

      // Check localStorage as fallback
      try {
        const stored = localStorage.getItem('auth-storage')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed?.state?.accessToken) {
            return // Has token in localStorage
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      }

      // No token found - redirect immediately
      window.location.replace(redirectTo)
    }

    // Small delay to ensure Zustand has hydrated
    const timer = setTimeout(checkAndRedirect, 100)
    return () => clearTimeout(timer)
  }, [isMounted, accessToken, redirectTo])

  // Show loading on server-side and before mount
  if (!isMounted) {
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

  // Check token one more time before rendering
  const hasToken = (() => {
    if (accessToken) return true
    try {
      const stored = localStorage.getItem('auth-storage')
      if (stored) {
        const parsed = JSON.parse(stored)
        return !!parsed?.state?.accessToken
      }
    } catch {
      // Ignore
    }
    return false
  })()

  // If no token, show redirect message (redirect will happen in useEffect)
  if (!hasToken) {
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
