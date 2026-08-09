'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/shared/Button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { FullscreenToggle } from '@/components/shared/FullscreenToggle'
import { KioskScroll } from '@/components/shared/KioskScroll'

export type AdminNavId =
  | 'dashboard'
  | 'categories'
  | 'products'
  | 'coupons'
  | 'reports'
  | 'settings'
  | 'bale'
  | 'users'

const NAV_ICONS: Record<AdminNavId, ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path
        d="M4 13h7V4H4v9zm9 7h7V4h-7v16zM4 20h7v-5H4v5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  categories: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path
        d="M4 8.5L12 4l8 4.5v7L12 20l-8-4.5v-7z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 12v8M12 12L4 8.5M12 12l8-3.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  coupons: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path
        d="M4 9a2 2 0 002-2V5h12v2a2 2 0 002 2v6a2 2 0 00-2 2v2H6v-2a2 2 0 00-2-2V9z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path
        d="M5 19V10M10 19V5M15 19v-7M20 19V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  bale: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path
        d="M21 5L2.5 11.5l6.2 2.3L17 8l-6.2 7.8 1.1 5.7L21 5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.5 18.5c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M15.2 18.5c.4-1.5 1.4-2.5 2.8-2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
}

export function AdminShell({
  title = 'کیوسک',
  navItems,
  activeId,
  onNavigate,
  username,
  isSuperuser,
  onLogout,
  children,
}: {
  title?: string
  navItems: { id: AdminNavId; label: string }[]
  activeId: AdminNavId
  onNavigate: (id: AdminNavId) => void
  username?: string
  isSuperuser?: boolean
  onLogout: () => void
  children: ReactNode
}) {
  const activeLabel = navItems.find((n) => n.id === activeId)?.label

  return (
    <div className="h-dvh overflow-hidden bg-[hsl(30_40%_97%)] text-foreground dark:bg-[hsl(0_0%_7%)]">
      {/* subtle atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(60% 40% at 100% 0%, rgba(225,113,0,0.09), transparent 55%),
            radial-gradient(40% 30% at 0% 100%, rgba(225,113,0,0.05), transparent 50%)
          `,
        }}
      />

      <div className="mx-auto flex h-full max-w-[1600px]">
        {/* Sidebar — RTL: sits on the right visually via flex order */}
        <aside className="hidden h-full w-[248px] shrink-0 flex-col border-s border-border/70 bg-card/80 px-3 py-5 backdrop-blur-xl lg:flex dark:bg-card/60">
          <div className="mb-8 px-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/25">
                K
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-tight">{title}</p>
                <p className="text-[11px] text-muted-foreground">پنل مدیریت</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-1">
            {navItems.map((item) => {
              const selected = activeId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                    selected
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className={cn(selected ? 'opacity-100' : 'opacity-70')}>
                    {NAV_ICONS[item.id]}
                  </span>
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto space-y-3 border-t border-border/70 px-2 pt-4">
            <div className="rounded-2xl bg-muted/60 px-3 py-3">
              <p className="truncate text-sm font-bold">{username || '—'}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isSuperuser ? 'سوپریوزر' : 'مدیر'}
              </p>
            </div>
            <div className="flex items-center gap-2 px-1">
              <FullscreenToggle />
              <ThemeToggle />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              خروج از حساب
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile / tablet top bar */}
          <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xs font-black text-white">
                  K
                </div>
                <div>
                  <p className="text-sm font-black">{title}</p>
                  <p className="text-[11px] text-muted-foreground">{activeLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FullscreenToggle />
                <ThemeToggle />
                <Button type="button" variant="outline" size="sm" onClick={onLogout}>
                  خروج
                </Button>
              </div>
            </div>

            {/* Mobile nav chips */}
            <KioskScroll
              orientation="horizontal"
              showRail={false}
              className="lg:hidden"
              contentClassName="flex gap-1.5 px-4 pb-3"
            >
              {navItems.map((item) => {
                const selected = activeId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
                      selected
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </KioskScroll>

            {/* Desktop top context bar */}
            <div className="hidden items-center justify-between px-8 py-4 lg:flex">
              <div>
                <p className="text-xs font-medium text-muted-foreground">بخش فعال</p>
                <h1 className="text-lg font-black tracking-tight">{activeLabel}</h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="hidden xl:inline">{username}</span>
              </div>
            </div>
          </header>

          <KioskScroll
            className="min-h-0 flex-1"
            contentClassName="px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </KioskScroll>
        </div>
      </div>
    </div>
  )
}
