'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { ReportsManager } from '@/components/admin/ReportsManager'
import { CategoriesManager } from '@/components/admin/CategoriesManager'
import { ProductsManager } from '@/components/admin/ProductsManager'
import { SettingsManager } from '@/components/admin/SettingsManager'
import { UsersManager } from '@/components/admin/UsersManager'
import { BaleBotManager } from '@/components/admin/BaleBotManager'
import { DashboardManager } from '@/components/admin/DashboardManager'
import { CouponsManager } from '@/components/admin/CouponsManager'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import {
  AdminShell,
  type AdminNavId,
} from '@/components/admin/ui/AdminShell'
import { AdminSurface } from '@/components/admin/ui/primitives'

function hasPerm(
  user: ReturnType<typeof useAuthStore.getState>['user'],
  code: string
) {
  if (!user) return false
  if (user.is_superuser) return true
  return (user.permissions || []).includes(code)
}

export default function AdminPage() {
  const { logout, user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<AdminNavId>('dashboard')

  const tabs = useMemo(() => {
    const items: { id: AdminNavId; label: string; visible: boolean }[] = [
      { id: 'dashboard', label: 'داشبورد', visible: hasPerm(user, 'view_reports') },
      { id: 'categories', label: 'دسته‌بندی', visible: hasPerm(user, 'view_categories') },
      { id: 'products', label: 'محصولات', visible: hasPerm(user, 'view_products') },
      {
        id: 'coupons',
        label: 'تخفیف',
        visible: hasPerm(user, 'manage_coupons') || hasPerm(user, 'view_reports'),
      },
      { id: 'reports', label: 'گزارشات', visible: hasPerm(user, 'view_reports') },
      { id: 'settings', label: 'تنظیمات', visible: hasPerm(user, 'change_settings') },
      { id: 'bale', label: 'ربات بله', visible: !!user?.is_superuser },
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
      <AdminShell
        navItems={tabs.map(({ id, label }) => ({ id, label }))}
        activeId={activeTab}
        onNavigate={setActiveTab}
        username={user?.username}
        isSuperuser={!!user?.is_superuser}
        onLogout={handleLogout}
      >
        {tabs.length === 0 && (
          <AdminSurface className="py-16 text-center">
            <p className="font-bold text-foreground">دسترسی‌ای برای نمایش منو ندارید</p>
            <p className="mt-2 text-sm text-muted-foreground">
              از سوپریوزر بخواهید گروه مناسب را به حساب شما اختصاص دهد.
            </p>
          </AdminSurface>
        )}
        {activeTab === 'dashboard' && hasPerm(user, 'view_reports') && (
          <DashboardManager />
        )}
        {activeTab === 'categories' && hasPerm(user, 'view_categories') && (
          <CategoriesManager />
        )}
        {activeTab === 'products' && hasPerm(user, 'view_products') && (
          <ProductsManager />
        )}
        {activeTab === 'coupons' &&
          (hasPerm(user, 'manage_coupons') || hasPerm(user, 'view_reports')) && (
            <CouponsManager />
          )}
        {activeTab === 'reports' && hasPerm(user, 'view_reports') && <ReportsManager />}
        {activeTab === 'settings' && hasPerm(user, 'change_settings') && (
          <SettingsManager />
        )}
        {activeTab === 'bale' && user?.is_superuser && <BaleBotManager />}
        {activeTab === 'users' && user?.is_superuser && <UsersManager />}
      </AdminShell>
    </ProtectedRoute>
  )
}
