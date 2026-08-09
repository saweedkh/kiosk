'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/lib/api/admin'
import { ProductForm } from './ProductForm'
import { ProductOptionsEditor } from './ProductOptionsEditor'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import {
  AdminAlert,
  AdminEmpty,
  AdminMeta,
  AdminPageHeader,
  AdminSelect,
  AdminStatusBadge,
  AdminSurface,
  AdminToolbar,
} from '@/components/admin/ui/primitives'
import { formatCurrency, translateError } from '@/lib/utils'
import type { Product, Category } from '@/types'
import { useAuthStore } from '@/lib/store/auth-store'
import { clearCachedMenu } from '@/lib/kiosk-persist'

function bustCustomerMenuCache(queryClient: ReturnType<typeof useQueryClient>) {
  clearCachedMenu()
  queryClient.invalidateQueries({ queryKey: ['products'] })
  queryClient.invalidateQueries({ queryKey: ['categories'] })
}

export function ProductsManager() {
  const { user } = useAuthStore()
  const canAdd = !!user?.is_superuser || (user?.permissions || []).includes('add_products')
  const canChange = !!user?.is_superuser || (user?.permissions || []).includes('change_products')
  const canDelete = !!user?.is_superuser || (user?.permissions || []).includes('delete_products')
  const canChangeStock =
    !!user?.is_superuser || (user?.permissions || []).includes('change_stock')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockQuantity, setStockQuantity] = useState(0)
  const [stockNotes, setStockNotes] = useState('')
  const [stockError, setStockError] = useState<string | null>(null)
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
      bustCustomerMenuCache(queryClient)
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
      bustCustomerMenuCache(queryClient)
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
      bustCustomerMenuCache(queryClient)
      setDeleteError(null)
    },
    onError: (error: any) => {
      const errorMessage = translateError(error)
      setDeleteError(errorMessage || 'خطا در حذف محصول. لطفا دوباره تلاش کنید.')
    },
  })

  const stockMutation = useMutation({
    mutationFn: ({ id, stock_quantity, notes }: { id: number; stock_quantity: number; notes?: string }) =>
      adminApi.updateProductStock(id, { stock_quantity, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      bustCustomerMenuCache(queryClient)
      setStockProduct(null)
      setStockNotes('')
      setStockError(null)
    },
    onError: (error: any) => {
      setStockError(translateError(error) || 'خطا در به‌روزرسانی موجودی.')
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
    // Stock via product form only when allowed (create always; edit needs change_stock)
    const allowStockInForm = !editingProduct || canChangeStock
    if (allowStockInForm && data.stock_quantity !== undefined)
      formData.append('stock_quantity', data.stock_quantity.toString())
    if (data.is_active !== undefined)
      formData.append('is_active', data.is_active.toString())
    if (data.service_fee_applicable !== undefined)
      formData.append('service_fee_applicable', data.service_fee_applicable.toString())
    
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

  const openStockEditor = (product: Product) => {
    setStockProduct(product)
    setStockQuantity(product.stock_quantity ?? 0)
    setStockNotes('')
    setStockError(null)
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
    <div className="space-y-5">
      <AdminPageHeader
        title="محصولات"
        description="کاتالوگ کیوسک را بسازید و موجودی را کنترل کنید."
        actions={
          canAdd ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditingProduct(null)
                setIsFormOpen(true)
              }}
            >
              افزودن محصول
            </Button>
          ) : undefined
        }
      />

      {isFormOpen && (
        <motion.div
          key={editingProduct?.id || 'new'}
          ref={formRef}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AdminSurface>
            <h3 className="mb-5 text-base font-bold text-foreground">
              {editingProduct ? 'ویرایش محصول' : 'محصول جدید'}
            </h3>
            <ProductForm
              product={editingProduct || undefined}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={createMutation.isPending || updateMutation.isPending}
              apiErrors={apiErrors}
              canEditStock={!editingProduct || canChangeStock}
            />
            {editingProduct ? (
              <ProductOptionsEditor
                productId={editingProduct.id}
                canEdit={canChange}
              />
            ) : null}
          </AdminSurface>
        </motion.div>
      )}

      {stockProduct && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AdminSurface className="space-y-4">
            <h3 className="text-base font-bold text-foreground">
              تغییر موجودی — {stockProduct.name}
            </h3>
            {stockError && (
              <p className="text-sm text-red-600 dark:text-red-400">{stockError}</p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="موجودی جدید"
                type="number"
                min={0}
                value={String(stockQuantity)}
                onChange={(e) =>
                  setStockQuantity(Math.max(0, Math.floor(Number(e.target.value) || 0)))
                }
              />
              <Input
                label="یادداشت (اختیاری)"
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                placeholder="مثلاً شمارش انبار"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  stockMutation.mutate({
                    id: stockProduct.id,
                    stock_quantity: stockQuantity,
                    notes: stockNotes || undefined,
                  })
                }
                isLoading={stockMutation.isPending}
              >
                ذخیره موجودی
              </Button>
              <Button variant="outline" onClick={() => setStockProduct(null)}>
                انصراف
              </Button>
            </div>
          </AdminSurface>
        </motion.div>
      )}

      {deleteError && (
        <AdminAlert tone="danger" onClose={() => setDeleteError(null)}>
          {deleteError}
        </AdminAlert>
      )}

      <AdminToolbar>
        <div className="min-w-0 flex-1">
          <Input
            type="text"
            placeholder="جستجو در محصولات..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-56">
          <AdminSelect value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
            <option value="-id">جدیدترین</option>
            <option value="id">قدیمی‌ترین</option>
            <option value="name">نام (صعودی)</option>
            <option value="-name">نام (نزولی)</option>
            <option value="price">قیمت ↑</option>
            <option value="-price">قیمت ↓</option>
            <option value="stock_quantity">موجودی ↑</option>
            <option value="-stock_quantity">موجودی ↓</option>
          </AdminSelect>
        </div>
      </AdminToolbar>

      {currentCount > 0 && (
        <AdminMeta>
          نمایش {((currentPage - 1) * pageSize) + 1} تا{' '}
          {Math.min(currentPage * pageSize, currentCount)} از {currentCount} محصول
        </AdminMeta>
      )}

      {productsLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <AdminSurface padded={false}>
          <AdminEmpty
            title="محصولی وجود ندارد"
            description="اولین محصول کاتالوگ را اضافه کنید."
          />
        </AdminSurface>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product: Product, index: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.2) }}
                className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/[0.02] transition-shadow hover:shadow-md"
              >
                <div className="relative h-44 w-full bg-muted">
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
                  <span className="text-sm text-muted-foreground">
                    موجودی: {product.stock_quantity}
                  </span>
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <AdminStatusBadge tone={product.is_active ? 'success' : 'danger'}>
                    {product.is_active ? 'فعال' : 'غیرفعال'}
                  </AdminStatusBadge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canChange && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      ویرایش
                    </Button>
                  )}
                  {canChangeStock && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openStockEditor(product)}
                      className="flex-1"
                    >
                      موجودی
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="flex-1"
                    >
                      حذف
                    </Button>
                  )}
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

