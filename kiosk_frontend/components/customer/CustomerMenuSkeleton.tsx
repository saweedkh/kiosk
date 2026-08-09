'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 dark:border-border-dark bg-card dark:bg-card-dark shadow-sm',
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

function CategoryChipSkeleton({ widthClass }: { widthClass: string }) {
  return <Skeleton className={cn('h-12 rounded-full', widthClass)} />
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
        'flex h-screen overflow-hidden bg-background dark:bg-background-dark',
        className
      )}
      aria-busy="true"
      aria-label="در حال بارگذاری منو"
    >
      <div className="flex w-2/3 flex-col overflow-hidden border-l border-border dark:border-border-dark">
        <header className="z-30 flex-shrink-0 border-b border-border dark:border-border-dark bg-card dark:bg-card-dark">
          <div className="flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-44 rounded-lg" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden px-6 py-8">
          <div className="mb-8 flex items-center gap-3 overflow-hidden pb-1">
            <CategoryChipSkeleton widthClass="w-28" />
            <CategoryChipSkeleton widthClass="w-24" />
            <CategoryChipSkeleton widthClass="w-32" />
            <CategoryChipSkeleton widthClass="w-20" />
            <CategoryChipSkeleton widthClass="w-36" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: productCount }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </main>

        <footer className="flex flex-col items-center gap-2 border-t border-border dark:border-border-dark py-6">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-3 w-28 rounded-md" />
        </footer>
      </div>

      <div className="flex w-1/3 flex-col overflow-hidden">
        <div className="flex h-full flex-col border border-border dark:border-border-dark bg-card dark:bg-card-dark shadow-lg">
          <div className="flex items-center gap-3 border-b border-border dark:border-border-dark p-6">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-28 rounded-lg" />
            <Skeleton className="mr-auto h-7 w-10 rounded-full" />
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-border/60 dark:border-border-dark p-3"
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
          <div className="space-y-3 border-t border-border dark:border-border-dark p-4">
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
    <div className="flex items-center gap-3 overflow-hidden pb-3">
      <CategoryChipSkeleton widthClass="w-28" />
      <CategoryChipSkeleton widthClass="w-24" />
      <CategoryChipSkeleton widthClass="w-32" />
      <CategoryChipSkeleton widthClass="w-20" />
    </div>
  )
}
