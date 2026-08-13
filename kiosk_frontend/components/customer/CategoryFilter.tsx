'use client'

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
  // Ensure categories is an array
  const categoriesArray = Array.isArray(categories) ? categories : []

  return (
    <div className="kiosk-scroll-x -mx-1 flex items-center gap-3 overflow-x-auto px-1 pb-3">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-colors touch-manipulation ${
          selectedCategory === null
            ? 'bg-primary text-white'
            : 'bg-gray dark:bg-gray-dark text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        همه موارد
      </button>

      {categoriesArray.map((category) => (
        <button
          type="button"
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-colors touch-manipulation ${
            selectedCategory === category.id
              ? 'bg-primary text-white'
              : 'bg-gray dark:bg-gray-dark text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
