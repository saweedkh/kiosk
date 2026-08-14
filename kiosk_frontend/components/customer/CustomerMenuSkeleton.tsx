'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm dark:border-border-dark dark:bg-card-dark',
        className
      )}
    >
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function CategoryCardSkeleton() {
  return (
    <Skeleton className="h-[7.5rem] w-[13.5rem] flex-shrink-0 rounded-2xl" />
  )
}

export function CustomerMenuSkeleton({
  className,
  productCount = 6,
}: {
  className?: string
  productCount?: number
}) {
  return (
    <div
      className={cn(
        'flex h-screen flex-col overflow-hidden bg-background dark:bg-background-dark',
        className
      )}
      aria-busy="true"
      aria-label="در حال بارگذاری منو"
    >
      <header className="z-30 w-full flex-shrink-0 border-b border-border bg-card dark:border-border-dark dark:bg-card-dark">
        <div className="flex items-center justify-between px-6 py-2.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-36 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </header>

      <section className="w-full flex-shrink-0 border-b border-border/70 bg-background/80 px-6 py-3 dark:border-border-dark dark:bg-background-dark/80">
        <div className="flex items-center gap-3 overflow-hidden py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </section>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex w-2/3 flex-col overflow-hidden border-l border-border dark:border-border-dark">
          <main className="flex-1 overflow-hidden px-6 py-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: productCount }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </main>

          <footer className="flex flex-col items-center gap-2 border-t border-border py-6 dark:border-border-dark">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </footer>
        </div>

        <div className="flex w-1/3 flex-col overflow-hidden">
          <div className="flex h-full flex-col border border-border bg-card shadow-lg dark:border-border-dark dark:bg-card-dark">
            <div className="flex items-center gap-3 border-b border-border p-6 dark:border-border-dark">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-lg" />
              <Skeleton className="mr-auto h-7 w-10 rounded-full" />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-border/60 p-3 dark:border-border-dark"
                >
                  <Skeleton className="h-20 w-20 flex-shrink-0 rounded-xl" />
                  <div className="flex flex-1 flex-col justify-center gap-2">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-border p-4 dark:border-border-dark">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <div className="flex items-center justify-between py-1">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-7 w-32 rounded-lg" />
              </div>
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function CategoryFilterSkeleton() {
  return (
    <div className="flex items-center gap-3 overflow-hidden py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  )
}
