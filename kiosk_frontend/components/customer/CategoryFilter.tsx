'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media-url'
import { useDragScroll } from '@/lib/use-drag-scroll'
import type { Category } from '@/types'

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: number | null
  onSelectCategory: (categoryId: number | null) => void
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
      className="kiosk-scroll-x -mx-1 flex cursor-grab items-center gap-3 overflow-x-auto px-1.5 py-2 active:cursor-grabbing"
    >
      {categoriesArray.map((category) => {
        const selected = selectedCategory === category.id
        const imageUrl = resolveMediaUrl(category.image)

        return (
          <button
            type="button"
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              'group relative isolate h-[7.5rem] w-[13.5rem] flex-shrink-0 overflow-hidden rounded-2xl text-start',
              'border-2 transition-colors duration-200',
              'focus-visible:outline-none focus-visible:border-primary',
              selected
                ? 'border-primary shadow-md shadow-primary/15'
                : 'border-black/[0.08] hover:border-primary/40 dark:border-white/15'
            )}
          >
            <div className="absolute inset-0 overflow-hidden rounded-[14px]">
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
            </div>

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
