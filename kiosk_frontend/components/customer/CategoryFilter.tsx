'use client'

import Image from 'next/image'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media-url'
import { useDragScroll } from '@/lib/use-drag-scroll'
import type { Category } from '@/types'

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: number | null
  onSelectCategory: (categoryId: number | null) => void
}

function tileClass(selected: boolean) {
  return cn(
    'group relative h-[7.5rem] w-[13.5rem] flex-shrink-0 overflow-hidden rounded-2xl text-start transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    selected
      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20 scale-[1.02]'
      : 'ring-1 ring-black/5 dark:ring-white/10 hover:ring-primary/35 hover:shadow-md'
  )
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const categoriesArray = Array.isArray(categories) ? categories : []
  const scrollRef = useDragScroll<HTMLDivElement>('x')

  return (
    <div
      ref={scrollRef}
      className="kiosk-scroll-x -mx-1 flex cursor-grab items-center gap-3 overflow-x-auto px-1 py-1 active:cursor-grabbing"
    >      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={tileClass(selectedCategory === null)}
      >
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br transition-opacity',
            selectedCategory === null
              ? 'from-primary via-[#F08A1A] to-[#C45E00]'
              : 'from-primary/85 via-primary to-[#C45E00] opacity-90 group-hover:opacity-100'
          )}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%)]" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2 px-4 text-white">
          <LayoutGrid className="h-8 w-8 drop-shadow-sm" strokeWidth={2} />
          <span className="text-lg font-bold tracking-tight drop-shadow-sm">
            همه موارد
          </span>
        </div>
      </button>

      {categoriesArray.map((category) => {
        const selected = selectedCategory === category.id
        const imageUrl = resolveMediaUrl(category.image)

        return (
          <button
            type="button"
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={tileClass(selected)}
          >
            {imageUrl ? (
              <>
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="216px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFE0C2] via-[#FFF3E8] to-[#F5C896] dark:from-[#3a2a1a] dark:via-[#2a2118] dark:to-[#1f1812]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(225,113,0,0.22),transparent_55%)]" />
              </>
            )}

            <div className="relative z-10 flex h-full flex-col justify-end p-3.5">
              <span
                className={cn(
                  'line-clamp-2 text-lg font-bold leading-snug',
                  imageUrl
                    ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]'
                    : 'text-text dark:text-text-dark'
                )}
              >
                {category.name}
              </span>
              {selected && (
                <span className="mt-1 h-1 w-10 rounded-full bg-primary" />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
