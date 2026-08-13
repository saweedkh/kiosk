'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/lib/api/admin'
import { CategoryForm } from './CategoryForm'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { translateError } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media-url'
import type { Category } from '@/types'
import { useAuthStore } from '@/lib/store/auth-store'
import { hasPermission } from '@/lib/auth/permissions'
import { clearCachedMenu } from '@/lib/kiosk-persist'

function bustCustomerMenuCache(queryClient: ReturnType<typeof useQueryClient>) {
  clearCachedMenu()
  queryClient.invalidateQueries({ queryKey: ['products'] })
  queryClient.invalidateQueries({ queryKey: ['categories'] })
}

export function CategoriesManager() {
  const { user } = useAuthStore()
  const canAdd = hasPermission(user, 'add_categories')
  const canChange = hasPermission(user, 'change_categories')
  const canDelete = hasPermission(user, 'delete_categories')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
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
      bustCustomerMenuCache(queryClient)
      setIsFormOpen(false)
      setCurrentPage(1) // Reset to first page
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      adminApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      bustCustomerMenuCache(queryClient)
      setEditingCategory(null)
      setIsFormOpen(false)
    },
  })

  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      bustCustomerMenuCache(queryClient)
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
    const formData = new FormData()
    if (data.name) formData.append('name', data.name)
    if (data.display_order !== undefined)
      formData.append('display_order', String(data.display_order))
    if (data.is_active !== undefined)
      formData.append('is_active', String(data.is_active))
    if (data.image instanceof File) {
      formData.append('image', data.image)
    }

    if (editingCategory) {
      await updateMutation.mutateAsync({ id: editingCategory.id, data: formData })
    } else {
      await createMutation.mutateAsync(formData)
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

  const handleDelete = async () => {
    if (!categoryToDelete) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(categoryToDelete.id)
      setCategoryToDelete(null)
    } catch {
      // Error is handled in onError callback
    }
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setEditingCategory(null)
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="دسته‌بندی‌ها"
        description="ساختار منوی کیوسک را مدیریت کنید."
        actions={
          canAdd ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditingCategory(null)
                setIsFormOpen(true)
              }}
            >
              افزودن دسته‌بندی
            </Button>
          ) : undefined
        }
      />

      {isFormOpen && (
        <motion.div
          key={editingCategory?.id || 'new'}
          ref={formRef}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AdminSurface>
            <h3 className="mb-5 text-base font-bold text-foreground">
              {editingCategory ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}
            </h3>
            <CategoryForm
              category={editingCategory || undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
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
            placeholder="جستجو در دسته‌بندی‌ها..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-56">
          <AdminSelect
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            <option value="-id">جدیدترین</option>
            <option value="id">قدیمی‌ترین</option>
            <option value="name">نام (صعودی)</option>
            <option value="-name">نام (نزولی)</option>
            <option value="display_order">ترتیب نمایش ↑</option>
            <option value="-display_order">ترتیب نمایش ↓</option>
          </AdminSelect>
        </div>
      </AdminToolbar>

      {currentCount > 0 && (
        <AdminMeta>
          نمایش {((currentPage - 1) * pageSize) + 1} تا{' '}
          {Math.min(currentPage * pageSize, currentCount)} از {currentCount} دسته‌بندی
        </AdminMeta>
      )}

      {isLoading ? (
        <AdminSurface className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </AdminSurface>
      ) : categories.length === 0 ? (
        <AdminSurface padded={false}>
          <AdminEmpty
            title="دسته‌بندی‌ای وجود ندارد"
            description="اولین دسته‌بندی منو را بسازید."
          />
        </AdminSurface>
      ) : (
        <AdminSurface padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40">
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">
                    تصویر
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">
                    نام
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">
                    ترتیب
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">
                    وضعیت
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {categories.map((category: Category, index: number) => (
                  <motion.tr
                    key={category.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.2) }}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3.5">
                      {resolveMediaUrl(category.image) ? (
                        <img
                          src={resolveMediaUrl(category.image)}
                          alt={category.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-foreground">
                      {category.name}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {category.display_order || 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <AdminStatusBadge tone={category.is_active ? 'success' : 'danger'}>
                        {category.is_active ? 'فعال' : 'غیرفعال'}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {canChange && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            ویرایش
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setCategoryToDelete(category)}
                          >
                            حذف
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSurface>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
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

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => {
          if (!open) setCategoryToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف دسته‌بندی</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید دسته‌بندی
              {categoryToDelete ? ` «${categoryToDelete.name}» ` : ' '}
              را حذف کنید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {deleteMutation.isPending ? 'در حال حذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

