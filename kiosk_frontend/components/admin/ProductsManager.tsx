'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/lib/api/admin'
import { ProductForm } from './ProductForm'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { formatCurrency, translateError } from '@/lib/utils'
import type { Product, Category } from '@/types'

export function ProductsManager() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string>('-id') // Default: newest first
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12) // Items per page
  const [apiErrors, setApiErrors] = useState<Record<string, string[]>>({})
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLDivElement>(null)

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products', searchTerm, sortBy, currentPage, pageSize],
    queryFn: async () => {
      const data = await adminApi.getProducts({
        search: searchTerm || undefined,
        ordering: sortBy,
        page: currentPage,
        page_size: pageSize,
      })
      
      return data
    },
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  })

  const createMutation = useMutation({
    mutationFn: adminApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setIsFormOpen(false)
      setCurrentPage(1) // Reset to first page
      setApiErrors({}) // Clear errors on success
    },
    onError: (error: any) => {
      // Handle API validation errors
      const responseData = error.response?.data
      if (responseData?.messages) {
        setApiErrors(responseData.messages)
      } else {
        const errorMessage = translateError(error)
        setApiErrors({ general: [errorMessage || 'خطا در ایجاد محصول. لطفا دوباره تلاش کنید.'] })
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      adminApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setEditingProduct(null)
      setIsFormOpen(false)
      setApiErrors({}) // Clear errors on success
    },
    onError: (error: any) => {
      // Handle API validation errors
      const responseData = error.response?.data
      if (responseData?.messages) {
        setApiErrors(responseData.messages)
      } else {
        const errorMessage = translateError(error)
        setApiErrors({ general: [errorMessage || 'خطا در به‌روزرسانی محصول. لطفا دوباره تلاش کنید.'] })
      }
    },
  })

  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setDeleteError(null)
    },
    onError: (error: any) => {
      const errorMessage = translateError(error)
      setDeleteError(errorMessage || 'خطا در حذف محصول. لطفا دوباره تلاش کنید.')
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

  const products = productsData?.result?.results || productsData?.result || []
  const categories = Array.isArray(categoriesData?.result)
    ? categoriesData.result
    : categoriesData?.result?.results || []
  
  // Pagination info
  const paginationData = productsData?.result
  const totalCount = paginationData?.count || (Array.isArray(productsData?.result) ? productsData.result.length : products.length)
  const totalPages = totalCount > 0 
    ? Math.ceil(totalCount / pageSize) 
    : 1
  const currentCount = totalCount

  const handleSubmit = async (data: any) => {
    // Create FormData for image upload
    const formData = new FormData()
    if (data.name) formData.append('name', data.name)
    if (data.description) formData.append('description', data.description)
    if (data.price !== undefined) formData.append('price', data.price.toString())
    if (data.category) formData.append('category', data.category.toString())
    if (data.stock_quantity !== undefined)
      formData.append('stock_quantity', data.stock_quantity.toString())
    if (data.is_active !== undefined)
      formData.append('is_active', data.is_active.toString())
    
    // Handle image upload
    if (data.image instanceof File) {
      console.log('Adding image to FormData:', data.image.name, data.image.size, data.image.type)
      formData.append('image', data.image)
    } else if (editingProduct?.image && !data.image) {
      // If editing and no new image, keep existing image (don't send anything)
      console.log('Keeping existing image:', editingProduct.image)
    } else {
      console.log('No image to upload')
    }

    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data: formData })
    } else {
      await createMutation.mutateAsync(formData)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  // اسکرول به فرم وقتی باز می‌شود یا محصول ویرایش تغییر می‌کند
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
  }, [isFormOpen, editingProduct])

  const handleDelete = async (id: number) => {
    if (confirm('آیا مطمئن هستید که می‌خواهید این محصول را حذف کنید؟')) {
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
    setEditingProduct(null)
    setApiErrors({}) // Clear errors on cancel
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text dark:text-text-dark">
          مدیریت محصولات
        </h2>
        <Button
          variant="primary"
          onClick={() => {
            setEditingProduct(null)
            setIsFormOpen(true)
          }}
        >
          + افزودن محصول
        </Button>
      </div>

      {isFormOpen && (
        <motion.div
          key={editingProduct?.id || 'new'}
          ref={formRef}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark"
        >
          <h3 className="text-xl font-bold text-text dark:text-text-dark mb-6">
            {editingProduct ? 'ویرایش محصول' : 'ایجاد محصول جدید'}
          </h3>
          <ProductForm
            product={editingProduct || undefined}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
            apiErrors={apiErrors}
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
              placeholder="جستجو در محصولات..."
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
              <option value="price">قیمت (کم به زیاد)</option>
              <option value="-price">قیمت (زیاد به کم)</option>
              <option value="stock_quantity">موجودی (کم به زیاد)</option>
              <option value="-stock_quantity">موجودی (زیاد به کم)</option>
            </select>
          </div>
        </div>
        
        {/* Results Count */}
        {currentCount > 0 && (
          <div className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            نمایش {((currentPage - 1) * pageSize) + 1} تا {Math.min(currentPage * pageSize, currentCount)} از {currentCount} محصول
          </div>
        )}
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-card dark:bg-card-dark rounded-2xl p-8 border border-border dark:border-border-dark text-center">
          <p className="text-text-secondary dark:text-gray-400">
            هیچ محصولی وجود ندارد
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: Product, index: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden"
              >
                <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={product.image?.startsWith('http://localhost') || product.image?.startsWith('http://')}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      بدون تصویر
                    </div>
                  )}
                </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-text dark:text-text-dark mb-2">
                  {product.name}
                </h3>
                {/* Description - Fixed height, max 2 lines */}
                <div className="h-[2.5rem] mb-4">
                  {product.description ? (
                    <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2">
                      {product.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-primary dark:text-primary-light">
                    {formatCurrency(product.price)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      product.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {product.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                    className="flex-1"
                  >
                    ویرایش
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="flex-1"
                  >
                    حذف
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
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

