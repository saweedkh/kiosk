'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/lib/api/admin'
import { CategoryForm } from './CategoryForm'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { translateError } from '@/lib/utils'
import type { Category } from '@/types'

export function CategoriesManager() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string>('-id') // Default: newest first
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20) // Items per page
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLDivElement>(null)

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['admin-categories', searchTerm, sortBy, currentPage, pageSize],
    queryFn: () => adminApi.getCategories({
      search: searchTerm || undefined,
      ordering: sortBy,
      page: currentPage,
      page_size: pageSize,
    }),
  })

  const createMutation = useMutation({
    mutationFn: adminApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setIsFormOpen(false)
      setCurrentPage(1) // Reset to first page
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      adminApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setEditingCategory(null)
      setIsFormOpen(false)
    },
  })

  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setDeleteError(null)
    },
    onError: (error: any) => {
      const errorMessage = translateError(error)
      setDeleteError(errorMessage || 'خطا در حذف دسته‌بندی. لطفا دوباره تلاش کنید.')
    },
  })

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value)
    setCurrentPage(1) // Reset to first page when sorting
  }

  const categories = Array.isArray(categoriesData?.result)
    ? categoriesData.result
    : categoriesData?.result?.results || []
  
  // Pagination info
  const paginationData = categoriesData?.result
  const totalCount = paginationData?.count || (Array.isArray(categoriesData?.result) ? categoriesData.result.length : categories.length)
  const totalPages = totalCount > 0 
    ? Math.ceil(totalCount / pageSize) 
    : 1
  const currentCount = totalCount

  const handleSubmit = async (data: any) => {
    if (editingCategory) {
      await updateMutation.mutateAsync({ id: editingCategory.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  // اسکرول به فرم وقتی باز می‌شود یا دسته‌بندی ویرایش تغییر می‌کند
  useEffect(() => {
    if (isFormOpen && formRef.current) {
      // کمی تاخیر برای اطمینان از رندر شدن فرم
      setTimeout(() => {
        formRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }, 100)
    }
  }, [isFormOpen, editingCategory])

  const handleDelete = async (id: number) => {
    if (confirm('آیا مطمئن هستید که می‌خواهید این دسته‌بندی را حذف کنید؟')) {
      setDeleteError(null)
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        // Error is handled in onError callback
      }
    }
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setEditingCategory(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text dark:text-text-dark">
          مدیریت دسته‌بندی‌ها
        </h2>
        <Button
          variant="primary"
          onClick={() => {
            setEditingCategory(null)
            setIsFormOpen(true)
          }}
        >
          + افزودن دسته‌بندی
        </Button>
      </div>

      {isFormOpen && (
        <motion.div
          key={editingCategory?.id || 'new'}
          ref={formRef}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark"
        >
          <h3 className="text-xl font-bold text-text dark:text-text-dark mb-6">
            {editingCategory ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی جدید'}
          </h3>
          <CategoryForm
            category={editingCategory || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </motion.div>
      )}

      {/* Delete Error Message */}
      {deleteError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-800 dark:text-red-200">{deleteError}</p>
            <button
              onClick={() => setDeleteError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Search and Sort Controls */}
      <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="جستجو در دسته‌بندی‌ها..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Sort Select */}
          <div className="w-full md:w-64">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-card dark:bg-card-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="-id">جدیدترین</option>
              <option value="id">قدیمی‌ترین</option>
              <option value="name">نام (صعودی)</option>
              <option value="-name">نام (نزولی)</option>
              <option value="display_order">ترتیب نمایش (کم به زیاد)</option>
              <option value="-display_order">ترتیب نمایش (زیاد به کم)</option>
            </select>
          </div>
        </div>
        
        {/* Results Count */}
        {currentCount > 0 && (
          <div className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            نمایش {((currentPage - 1) * pageSize) + 1} تا {Math.min(currentPage * pageSize, currentCount)} از {currentCount} دسته‌بندی
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-card dark:bg-card-dark rounded-2xl p-8 border border-border dark:border-border-dark text-center">
          <p className="text-text-secondary dark:text-gray-400">
            هیچ دسته‌بندی‌ای وجود ندارد
          </p>
        </div>
      ) : (
        <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">
                    نام
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">
                    ترتیب نمایش
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">
                    وضعیت
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border-dark">
                {categories.map((category: Category, index: number) => (
                  <motion.tr
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-6 py-4 text-sm text-text dark:text-text-dark">
                      {category.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-text dark:text-text-dark">
                      {category.display_order || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          category.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {category.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          ویرایش
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            قبلی
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="min-w-[40px]"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            بعدی
          </Button>
        </div>
      )}
    </div>
  )
}

