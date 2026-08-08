'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/shared/Button'
import { ReportsManager } from '@/components/admin/ReportsManager'
import { CategoriesManager } from '@/components/admin/CategoriesManager'
import { ProductsManager } from '@/components/admin/ProductsManager'
import { SettingsManager } from '@/components/admin/SettingsManager'
import { UsersManager } from '@/components/admin/UsersManager'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'

type AdminTab = 'categories' | 'products' | 'reports' | 'settings' | 'users'

function hasPerm(user: ReturnType<typeof useAuthStore.getState>['user'], code: string) {
  if (!user) return false
  if (user.is_superuser) return true
  return (user.permissions || []).includes(code)
}

export default function AdminPage() {
  const { logout, user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<AdminTab>('products')

  const tabs = useMemo(() => {
    const items: { id: AdminTab; label: string; visible: boolean }[] = [
      { id: 'categories', label: 'دسته بندی', visible: hasPerm(user, 'view_categories') },
      { id: 'products', label: 'محصولات', visible: hasPerm(user, 'view_products') },
      { id: 'reports', label: 'گزارشات', visible: hasPerm(user, 'view_reports') },
      { id: 'settings', label: 'تنظیمات', visible: hasPerm(user, 'change_settings') },
      { id: 'users', label: 'کاربران', visible: !!user?.is_superuser },
    ]
    return items.filter((t) => t.visible)
  }, [user])

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('from-admin', 'true')
      localStorage.removeItem('auth-storage')
    }
    logout()
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('from-admin', 'true')
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background dark:bg-background-dark">
        <header className="bg-card dark:bg-card-dark border-b border-border dark:border-border-dark sticky top-0 z-30">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-text dark:text-text-dark">
                پنل مدیریت
              </h1>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <div className="text-sm text-text-secondary dark:text-gray-400">
                  {user?.username}
                  {user?.is_superuser ? ' (سوپریوزر)' : ''}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  خروج
                </Button>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-8 border-b border-border dark:border-border-dark overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-primary dark:text-primary-light border-primary font-bold'
                      : 'text-text-secondary dark:text-gray-400 border-transparent hover:text-text dark:hover:text-text-dark hover:border-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {tabs.length === 0 && (
            <div className="rounded-2xl border border-border dark:border-border-dark p-8 text-center">
              هیچ دسترسی برای نمایش منو ندارید. از سوپریوزر بخواهید گروه مناسب را به حساب شما اختصاص دهد.
            </div>
          )}
          {activeTab === 'categories' && hasPerm(user, 'view_categories') && <CategoriesManager />}
          {activeTab === 'products' && hasPerm(user, 'view_products') && <ProductsManager />}
          {activeTab === 'reports' && hasPerm(user, 'view_reports') && <ReportsManager />}
          {activeTab === 'settings' && hasPerm(user, 'change_settings') && <SettingsManager />}
          {activeTab === 'users' && user?.is_superuser && (
            <UsersManager />
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
