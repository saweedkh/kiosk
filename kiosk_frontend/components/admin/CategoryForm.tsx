'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Switch } from '@/components/shared/Switch'
import type { Category } from '@/types'

const categorySchema = z.object({
  name: z.string().min(1, 'نام الزامی است'),
  display_order: z.number().optional(),
  is_active: z.boolean().optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormProps {
  category?: Category
  onSubmit: (data: CategoryFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function CategoryForm({
  category,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryFormProps) {
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

