'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { hasPermission } from '@/lib/auth/permissions'
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

export default function AdminPage() {
  const { logout, user, hasHydrated } = useAuthStore()
  const [activeTab, setActiveTab] = useState<AdminNavId>('dashboard')

  const tabs = useMemo(() => {
    if (!hasHydrated || !user) return []
    const items: { id: AdminNavId; label: string; visible: boolean }[] = [
      { id: 'dashboard', label: 'داشبورد', visible: hasPermission(user, 'view_reports') },
      { id: 'categories', label: 'دسته‌بندی', visible: hasPermission(user, 'view_categories') },
      { id: 'products', label: 'محصولات', visible: hasPermission(user, 'view_products') },
      {
        id: 'coupons',
        label: 'تخفیف',
        visible:
          hasPermission(user, 'manage_coupons') || hasPermission(user, 'view_reports'),
      },
      { id: 'reports', label: 'گزارشات', visible: hasPermission(user, 'view_reports') },
      { id: 'settings', label: 'تنظیمات', visible: hasPermission(user, 'change_settings') },
      { id: 'bale', label: 'ربات بله', visible: hasPermission(user, 'manage_bale') },
      { id: 'users', label: 'کاربران', visible: hasPermission(user, 'manage_users') },
    ]
    return items.filter((t) => t.visible)
  }, [user, hasHydrated])

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
        {!hasHydrated ? (
          <AdminSurface className="py-16 text-center text-muted-foreground">
            در حال بارگذاری دسترسی‌ها...
          </AdminSurface>
        ) : null}

        {hasHydrated && user && tabs.length === 0 ? (
          <AdminSurface className="py-16 text-center">
            <p className="font-bold text-foreground">دسترسی‌ای برای نمایش منو ندارید</p>
            <p className="mt-2 text-sm text-muted-foreground">
              از سوپریوزر بخواهید گروه مناسب را به حساب شما اختصاص دهد.
            </p>
          </AdminSurface>
        ) : null}

        {hasHydrated && user && activeTab === 'dashboard' && hasPermission(user, 'view_reports') && (
          <DashboardManager />
        )}
        {hasHydrated && user && activeTab === 'categories' && hasPermission(user, 'view_categories') && (
          <CategoriesManager />
        )}
        {hasHydrated && user && activeTab === 'products' && hasPermission(user, 'view_products') && (
          <ProductsManager />
        )}
        {hasHydrated &&
          user &&
          activeTab === 'coupons' &&
          (hasPermission(user, 'manage_coupons') || hasPermission(user, 'view_reports')) && (
            <CouponsManager />
          )}
        {hasHydrated && user && activeTab === 'reports' && hasPermission(user, 'view_reports') && (
          <ReportsManager />
        )}
        {hasHydrated && user && activeTab === 'settings' && hasPermission(user, 'change_settings') && (
          <SettingsManager />
        )}
        {hasHydrated && user && activeTab === 'bale' && hasPermission(user, 'manage_bale') && (
          <BaleBotManager />
        )}
        {hasHydrated && user && activeTab === 'users' && hasPermission(user, 'manage_users') && (
          <UsersManager />
        )}
      </AdminShell>
    </ProtectedRoute>
  )
}
