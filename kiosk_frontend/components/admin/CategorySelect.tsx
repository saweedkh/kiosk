'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Category } from '@/types'

interface CategorySelectProps {
  categories: Category[]
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  error?: string
  label?: string | React.ReactNode
  excludeIds?: number[]
}

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = 'انتخاب دسته‌بندی',
  error,
  label = 'دسته‌بندی',
  excludeIds = [],
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedCategory = categories.find((cat) => cat.id === value)

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    const notExcluded = !excludeIds.includes(cat.id)
    return matchesSearch && notExcluded
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus input when dropdown opens
      setTimeout(() => inputRef.current?.focus(), 0)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (categoryId: number | null) => {
    onChange(categoryId)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block mb-2 text-sm font-medium text-text dark:text-text-dark">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-lg border ${
          error
            ? 'border-red-500 dark:border-red-500'
            : 'border-border dark:border-border-dark'
        } bg-card dark:bg-card-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between transition-colors hover:border-primary`}
      >
        <span className={selectedCategory ? '' : 'text-text-secondary dark:text-gray-400'}>
          {selectedCategory ? selectedCategory.name : placeholder}
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-20 w-full mt-2 bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-lg shadow-lg max-h-64 overflow-hidden"
            >
              {/* Search Input */}
              <div className="p-2 border-b border-border dark:border-border-dark">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجو..."
                  className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-background dark:bg-background-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Options List */}
              <div className="max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`w-full text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    value === null
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary font-medium'
                      : 'text-text dark:text-text-dark'
                  }`}
                >
                  بدون دسته‌بندی
                </button>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleSelect(category.id)}
                      className={`w-full text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                        value === category.id
                          ? 'bg-primary/10 dark:bg-primary/20 text-primary font-medium'
                          : 'text-text dark:text-text-dark'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-center text-text-secondary dark:text-gray-400">
                    دسته‌بندی یافت نشد
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

