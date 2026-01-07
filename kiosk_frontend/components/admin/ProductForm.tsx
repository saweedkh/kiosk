'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Switch } from '@/components/shared/Switch'
import { CategorySelect } from './CategorySelect'
import type { Product, Category } from '@/types'

const productSchema = z.object({
  name: z.string().min(1, 'نام الزامی است'),
  description: z.string().optional(),
  price: z.number().min(0, 'قیمت باید مثبت باشد'),
  category: z.number().nullable(),
  stock_quantity: z.number().min(0, 'تعداد موجودی باید مثبت باشد').optional(),
  is_active: z.boolean().optional(),
  image: z.any().optional(),
}).refine((data) => data.category !== null && data.category !== undefined, {
  message: 'دسته‌بندی الزامی است',
  path: ['category'],
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product
  categories?: Category[]
  onSubmit: (data: ProductFormData & { image?: File }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  apiErrors?: Record<string, string[]>
}

export function ProductForm({
  product,
  categories = [],
  onSubmit,
  onCancel,
  isLoading = false,
  apiErrors = {},
}: ProductFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.image || null
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || 0,
      category: product?.category || null,
      stock_quantity: product?.stock_quantity || 0,
      is_active: product?.is_active ?? true,
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFormSubmit = async (data: ProductFormData) => {
    // Get image file from input using ref or querySelector
    const imageInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const imageFile = imageInput?.files?.[0]
    
    if (imageFile) {
      console.log('Image file selected:', imageFile.name, imageFile.size, imageFile.type)
    } else if (product?.image) {
      console.log('Using existing image:', product.image)
    } else {
      console.log('No image provided')
    }
    
    const submitData = {
      ...data,
      image: imageFile || undefined,
    }
    await onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* نمایش ارورهای کلی API */}
      {Object.keys(apiErrors).length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            خطاهای اعتبارسنجی:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {Object.entries(apiErrors).map(([field, messages]) => (
              <li key={field} className="text-sm text-red-700 dark:text-red-300">
                {Array.isArray(messages) ? messages.join(', ') : messages}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Input
          label={
            <>
              نام محصول <span className="text-red-500">*</span>
            </>
          }
          {...register('name')}
          error={errors.name?.message || apiErrors.name?.[0]}
          required
        />
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-text dark:text-text-dark">
          توضیحات
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-card dark:bg-card-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Input
            label={
              <>
                قیمت (ریال) <span className="text-red-500">*</span>
              </>
            }
            type="number"
            {...register('price', { valueAsNumber: true })}
            error={errors.price?.message || apiErrors.price?.[0]}
            required
          />
        </div>

        <div>
          <Input
            label="تعداد موجودی"
            type="number"
            {...register('stock_quantity', { valueAsNumber: true })}
            error={errors.stock_quantity?.message}
          />
        </div>
      </div>

      <Controller
        name="category"
        control={control}
        render={({ field, fieldState }) => (
          <CategorySelect
            categories={Array.isArray(categories) ? categories : []}
            value={field.value ?? null}
            onChange={field.onChange}
            error={fieldState.error?.message || apiErrors.category?.[0]}
            label={
              <>
                دسته‌بندی <span className="text-red-500">*</span>
              </>
            }
          />
        )}
      />

      <div>
        <label className="block mb-2 text-sm font-medium text-text dark:text-text-dark">
          تصویر محصول
        </label>
        <input
          type="file"
          accept="image/*"
          {...register('image')}
          onChange={handleImageChange}
          className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-card dark:bg-card-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {imagePreview && (
          <div className="mt-4">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg"
            />
          </div>
        )}
      </div>

      <Controller
        name="is_active"
        control={control}
        render={({ field }) => (
          <Switch
            checked={field.value ?? true}
            onChange={field.onChange}
            label="فعال"
          />
        )}
      />

      <div className="flex gap-4">
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {product ? 'ذخیره تغییرات' : 'ایجاد محصول'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </form>
  )
}

