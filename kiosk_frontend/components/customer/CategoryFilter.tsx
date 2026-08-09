'use client'

import { motion } from 'framer-motion'
import type { Category } from '@/types'
import { KioskScroll } from '@/components/shared/KioskScroll'

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

  return (
    <KioskScroll
      orientation="horizontal"
      showRail={false}
      contentClassName="flex items-center gap-3 px-1 pb-1"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelectCategory(null)}
        className={`shrink-0 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${
          selectedCategory === null
            ? 'bg-primary text-white'
            : 'bg-gray dark:bg-gray-dark text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        همه
      </motion.button>
      {categoriesArray.map((category) => (
        <motion.button
          key={category.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectCategory(category.id)}
          className={`shrink-0 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${
            selectedCategory === category.id
              ? 'bg-primary text-white'
              : 'bg-gray dark:bg-gray-dark text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {category.name}
        </motion.button>
      ))}
    </KioskScroll>
  )
}
