'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/shared/Button'
import { ReportsManager } from '@/components/admin/ReportsManager'
import { CategoriesManager } from '@/components/admin/CategoriesManager'
import { ProductsManager } from '@/components/admin/ProductsManager'
import { SettingsManager } from '@/components/admin/SettingsManager'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'

export default function AdminPage() {
  const router = useRouter()
  const { logout, user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'reports' | 'settings'>('categories')
  const [showExitGuide, setShowExitGuide] = useState(false)

  const handleLogout = () => {
    // Clear localStorage first
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('from-admin', 'true')
      // Clear auth storage immediately
      localStorage.removeItem('auth-storage')
    }
    
    // Logout from store
    logout()
    
    // Use window.location for immediate redirect to avoid ProtectedRoute interference
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  // Clear localStorage when navigating away from admin to customer page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('from-admin', 'true')
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
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
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowExitGuide(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                >
                  راهنمای خروج از Kiosk
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  خروج از حساب
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-6 flex items-center gap-8 border-b border-border dark:border-border-dark">
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`pb-4 border-b-2 transition-colors ${
                  activeTab === 'categories'
                    ? 'text-primary dark:text-primary-light border-primary font-bold'
                    : 'text-text-secondary dark:text-gray-400 border-transparent hover:text-text dark:hover:text-text-dark hover:border-primary'
                }`}
              >
                دسته بندی
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`pb-4 border-b-2 transition-colors ${
                  activeTab === 'products'
                    ? 'text-primary dark:text-primary-light border-primary font-bold'
                    : 'text-text-secondary dark:text-gray-400 border-transparent hover:text-text dark:hover:text-text-dark hover:border-primary'
                }`}
              >
                محصولات
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`pb-4 border-b-2 transition-colors ${
                  activeTab === 'reports'
                    ? 'text-primary dark:text-primary-light border-primary font-bold'
                    : 'text-text-secondary dark:text-gray-400 border-transparent hover:text-text dark:hover:text-text-dark hover:border-primary'
                }`}
              >
                گزارشات
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`pb-4 border-b-2 transition-colors ${
                  activeTab === 'settings'
                    ? 'text-primary dark:text-primary-light border-primary font-bold'
                    : 'text-text-secondary dark:text-gray-400 border-transparent hover:text-text dark:hover:text-text-dark hover:border-primary'
                }`}
              >
                تنظیمات
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {showExitGuide && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card dark:bg-card-dark p-6 rounded-lg max-w-2xl mx-4">
                <h2 className="text-2xl font-bold mb-4 text-text dark:text-text-dark">
                  راهنمای خروج از حالت Kiosk
                </h2>
                <div className="space-y-4 text-text dark:text-text-dark">
                  <div>
                    <h3 className="font-bold text-lg mb-2">برای کیوسک لمسی (بدون موس و کیبورد):</h3>
                    <ul className="list-disc list-inside space-y-2 mr-4">
                      <li>راه‌اندازی مجدد سیستم (Restart) - دکمه Power را فشار دهید و نگه دارید</li>
                      <li>دسترسی فیزیکی به سیستم - اگر به سیستم دسترسی دارید، Task Manager را باز کنید (Ctrl+Shift+Esc) و Chrome را ببندید</li>
                      <li>دسترسی از راه دور - از طریق Remote Desktop یا TeamViewer به سیستم وصل شوید</li>
                      <li>دکمه Reset فیزیکی - اگر دستگاه دکمه Reset دارد، از آن استفاده کنید</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">برای کیوسک با کیبورد:</h3>
                    <ul className="list-disc list-inside space-y-2 mr-4">
                      <li>Ctrl+Alt+Del - برای باز کردن Task Manager</li>
                      <li>Alt+F4 - برای بستن Chrome (اگر focus روی آن باشد)</li>
                      <li>Ctrl+Shift+Esc - برای باز کردن مستقیم Task Manager</li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border dark:border-border-dark">
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                      توجه: برای امنیت بیشتر، توصیه می‌شود که Task Manager را از طریق Group Policy غیرفعال کنید.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setShowExitGuide(false)}>
                    بستن
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && <CategoriesManager />}

          {activeTab === 'products' && <ProductsManager />}

          {activeTab === 'reports' && <ReportsManager />}

          {activeTab === 'settings' && <SettingsManager />}
        </main>
      </div>
    </ProtectedRoute>
  )
}
