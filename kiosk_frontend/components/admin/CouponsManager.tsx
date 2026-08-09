'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { couponsApi } from '@/lib/api/dashboard'
import type { Coupon } from '@/types'
import { formatNumber } from '@/lib/utils'
import {
  AdminPageHeader,
  AdminSurface,
  AdminToolbar,
} from '@/components/admin/ui/primitives'
import { Button } from '@/components/shared/Button'
import { useAuthStore } from '@/lib/store/auth-store'

const emptyForm = {
  code: '',
  discount_type: 'percent' as 'percent' | 'fixed',
  value: 10,
  min_order_amount: 0,
  max_discount_amount: '' as number | '',
  max_uses: '' as number | '',
  is_active: true,
}

export function CouponsManager() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage =
    !!user?.is_superuser || (user?.permissions || []).includes('manage_coupons')

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const listQuery = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => couponsApi.list(),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Partial<Coupon> = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        value: Number(form.value) || 0,
        min_order_amount: Number(form.min_order_amount) || 0,
        max_discount_amount:
          form.max_discount_amount === '' ? null : Number(form.max_discount_amount),
        max_uses: form.max_uses === '' ? null : Number(form.max_uses),
        is_active: form.is_active,
      }
      if (editingId) return couponsApi.update(editingId, body)
      return couponsApi.create(body)
    },
    onSuccess: () => {
      setForm(emptyForm)
      setEditingId(null)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.messages ||
        err?.response?.data?.detail ||
        err?.message ||
        'خطا در ذخیره کوپن'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => couponsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  })

  const startEdit = (c: Coupon) => {
    setEditingId(c.id)
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      value: c.value,
      min_order_amount: c.min_order_amount,
      max_discount_amount: c.max_discount_amount ?? '',
      max_uses: c.max_uses ?? '',
      is_active: c.is_active,
    })
  }

  return (
    <div>
      <AdminPageHeader
        title="کوپن تخفیف"
        description="کدهای درصدی یا مبلغ ثابت برای اعمال در سبد کیوسک."
      />

      {canManage ? (
        <AdminSurface className="mb-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">کد</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="OFF10"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">نوع</span>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.discount_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    discount_type: e.target.value as 'percent' | 'fixed',
                  }))
                }
              >
                <option value="percent">درصدی</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">مقدار</span>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: Number(e.target.value) }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">حداقل سفارش</span>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.min_order_amount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    min_order_amount: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">سقف تخفیف</span>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.max_discount_amount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    max_discount_amount:
                      e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="اختیاری"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">حداکثر استفاده</span>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.max_uses}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    max_uses: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="نامحدود"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />
              فعال
            </label>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.code.trim()}
            >
              {editingId ? 'بروزرسانی' : 'ایجاد کوپن'}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
              >
                انصراف
              </Button>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </AdminSurface>
      ) : null}

      <AdminToolbar>
        <p className="text-sm text-muted-foreground">
          {formatNumber(listQuery.data?.length || 0)} کوپن
        </p>
      </AdminToolbar>

      <div className="space-y-2">
        {(listQuery.data || []).map((c) => (
          <AdminSurface key={c.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black tracking-wide">{c.code}</p>
              <p className="text-sm text-muted-foreground">
                {c.discount_type === 'percent'
                  ? `${formatNumber(c.value)}٪`
                  : `${formatNumber(c.value)} ریال`}
                {' · '}
                استفاده: {formatNumber(c.used_count)}
                {c.max_uses != null ? ` / ${formatNumber(c.max_uses)}` : ''}
                {!c.is_active ? ' · غیرفعال' : ''}
              </p>
            </div>
            {canManage ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(c)}>
                  ویرایش
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('حذف این کوپن؟')) deleteMutation.mutate(c.id)
                  }}
                >
                  حذف
                </Button>
              </div>
            ) : null}
          </AdminSurface>
        ))}
        {!listQuery.isLoading && !(listQuery.data || []).length ? (
          <AdminSurface className="py-10 text-center text-muted-foreground">
            هنوز کوپنی تعریف نشده است.
          </AdminSurface>
        ) : null}
      </div>
    </div>
  )
}
