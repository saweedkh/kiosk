'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Switch } from '@/components/shared/Switch'
import { resolveMediaUrl } from '@/lib/media-url'
import type { Category } from '@/types'

const categorySchema = z.object({
  name: z.string().min(1, 'نام الزامی است'),
  display_order: z.number().optional(),
  is_active: z.boolean().optional(),
  image: z.any().optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormProps {
  category?: Category
  onSubmit: (data: CategoryFormData & { image?: File }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function CategoryForm({
  category,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    resolveMediaUrl(category?.image) || null
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      display_order: category?.display_order || 0,
      is_active: category?.is_active ?? true,
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleFormSubmit = async (data: CategoryFormData) => {
    const imageInput = document.querySelector(
      'input[type="file"][name="image"]'
    ) as HTMLInputElement | null
    const imageFile = imageInput?.files?.[0]
    await onSubmit({
      ...data,
      image: imageFile || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <Input
          label="نام دسته‌بندی"
          {...register('name')}
          error={errors.name?.message}
          required
        />
      </div>

      <div>
        <Input
          label="ترتیب نمایش"
          type="number"
          {...register('display_order', { valueAsNumber: true })}
          error={errors.display_order?.message}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-text dark:text-text-dark">
          تصویر دسته‌بندی
        </label>
        <input
          type="file"
          accept="image/*"
          {...register('image')}
          onChange={handleImageChange}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-card-dark dark:text-text-dark"
        />
        {imagePreview && (
          <div className="mt-4">
            <img
              src={imagePreview}
              alt="پیش‌نمایش"
              className="h-32 w-32 rounded-xl object-cover"
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
          {category ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </form>
  )
}
