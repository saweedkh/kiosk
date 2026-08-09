'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TicketPercent, Pencil, Trash2, Plus } from 'lucide-react'
import { couponsApi } from '@/lib/api/dashboard'
import { adminApi } from '@/lib/api/admin'
import type { Coupon } from '@/types'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import {
  AdminAlert,
  AdminEmpty,
  AdminPageHeader,
  AdminSegmented,
  AdminStatusBadge,
  AdminSurface,
} from '@/components/admin/ui/primitives'
import { Button } from '@/components/shared/Button'
import { Switch } from '@/components/shared/Switch'
import { useAuthStore } from '@/lib/store/auth-store'
import { hasPermission } from '@/lib/auth/permissions'

const emptyForm = {
  code: '',
  discount_type: 'percent' as 'percent' | 'fixed',
  value: 10,
  min_order_amount: 0,
  max_discount_amount: '' as number | '',
  max_uses: '' as number | '',
  is_active: true,
}

function discountLabel(c: Coupon) {
  if (c.discount_type === 'percent') {
    return `${formatNumber(c.value)}٪`
  }
  return formatCurrency(c.value)
}

export function CouponsManager() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = hasPermission(user, 'manage_coupons')

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [featureEnabled, setFeatureEnabled] = useState(true)

  const listQuery = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => couponsApi.list(),
  })

  const settingsQuery = useQuery({
    queryKey: ['admin-settings-coupons'],
    queryFn: async () => {
      const res = await adminApi.getSettings()
      return res?.result ?? res
    },
  })

  useEffect(() => {
    if (settingsQuery.data && typeof settingsQuery.data.coupons_enabled === 'boolean') {
      setFeatureEnabled(settingsQuery.data.coupons_enabled)
    }
  }, [settingsQuery.data])

  const activeCount = useMemo(
    () => (listQuery.data || []).filter((c) => c.is_active).length,
    [listQuery.data]
  )

  const featureMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      adminApi.patchSettings({ coupons_enabled: enabled }),
    onMutate: async (enabled) => {
      setFeatureEnabled(enabled)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings-coupons'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => {
      setFeatureEnabled(Boolean(settingsQuery.data?.coupons_enabled))
      setError('خطا در تغییر وضعیت کوپن‌ها')
    },
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      couponsApi.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
    onError: () => setError('خطا در تغییر وضعیت کوپن'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => couponsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  })

  const startEdit = (c: Coupon) => {
    setEditingId(c.id)
    setError('')
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      value: c.value,
      min_order_amount: c.min_order_amount,
      max_discount_amount: c.max_discount_amount ?? '',
      max_uses: c.max_uses ?? '',
      is_active: c.is_active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  return (
    <div>
      <AdminPageHeader
        title="کوپن تخفیف"
        description="کدهای درصدی یا مبلغ ثابت برای سبد کیوسک. با سوئیچ اصلی می‌توانید کل قابلیت را برای مشتری خاموش کنید."
      />

      {error ? (
        <AdminAlert tone="danger" onClose={() => setError('')}>
          {error}
        </AdminAlert>
      ) : null}

      <AdminSurface
        className={cn(
          'mb-5 overflow-hidden',
          featureEnabled
            ? 'border-primary/25 bg-gradient-to-l from-primary/[0.07] via-card to-card'
            : 'bg-muted/20'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                featureEnabled
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <TicketPercent className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-black text-foreground">نمایش برای مشتری</p>
                <AdminStatusBadge tone={featureEnabled ? 'success' : 'neutral'}>
                  {featureEnabled ? 'فعال' : 'غیرفعال'}
                </AdminStatusBadge>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {featureEnabled
                  ? 'فیلد کد تخفیف در سبد خرید کیوسک نمایش داده می‌شود.'
                  : 'کد تخفیف از سبد مشتری مخفی است و اعمال کوپن هم رد می‌شود.'}
              </p>
            </div>
          </div>
          {canManage ? (
            <Switch
              checked={featureEnabled}
              onChange={(v) => featureMutation.mutate(v)}
              disabled={featureMutation.isPending || settingsQuery.isLoading}
              label={featureEnabled ? 'روشن' : 'خاموش'}
            />
          ) : null}
        </div>
      </AdminSurface>

      {canManage ? (
        <AdminSurface className="mb-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {editingId ? 'ویرایش کوپن' : 'کوپن جدید'}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                کد را بدون فاصله وارد کنید؛ خودکار به حروف بزرگ تبدیل می‌شود.
              </p>
            </div>
            {editingId ? (
              <AdminStatusBadge tone="primary">در حال ویرایش</AdminStatusBadge>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm sm:col-span-1">
              <span className="mb-1.5 block font-medium text-muted-foreground">کد کوپن</span>
              <input
                className="h-11 w-full rounded-xl border border-border bg-background px-3 font-bold tracking-wider outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="OFF10"
                dir="ltr"
              />
            </label>

            <div className="text-sm">
              <span className="mb-1.5 block font-medium text-muted-foreground">نوع تخفیف</span>
              <AdminSegmented
                value={form.discount_type}
                onChange={(v) => setForm((f) => ({ ...f, discount_type: v }))}
                options={[
                  { id: 'percent', label: 'درصدی' },
                  { id: 'fixed', label: 'مبلغ ثابت' },
                ]}
                className="w-full"
              />
            </div>

            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-muted-foreground">
                {form.discount_type === 'percent' ? 'درصد تخفیف' : 'مبلغ تخفیف (ریال)'}
              </span>
              <input
                type="number"
                min={0}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: Number(e.target.value) }))
                }
              />
            </label>

            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-muted-foreground">
                حداقل مبلغ سفارش
              </span>
              <input
                type="number"
                min={0}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
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
              <span className="mb-1.5 block font-medium text-muted-foreground">
                سقف تخفیف (اختیاری)
              </span>
              <input
                type="number"
                min={0}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
                value={form.max_discount_amount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    max_discount_amount:
                      e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="بدون سقف"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-muted-foreground">
                حداکثر استفاده
              </span>
              <input
                type="number"
                min={0}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
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

          <div
            className={cn(
              'mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3',
              form.is_active
                ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                : 'border-border/80 bg-muted/30'
            )}
          >
            <div>
              <p className="text-sm font-bold text-foreground">وضعیت این کوپن</p>
              <p className="text-xs text-muted-foreground">
                {form.is_active
                  ? 'قابل استفاده در کیوسک (در صورت روشن بودن قابلیت کلی)'
                  : 'غیرفعال — مشتری نمی‌تواند از این کد استفاده کند'}
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              label={form.is_active ? 'فعال' : 'غیرفعال'}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.code.trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {editingId ? 'بروزرسانی کوپن' : 'ایجاد کوپن'}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                انصراف
              </Button>
            ) : null}
          </div>
        </AdminSurface>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {formatNumber(listQuery.data?.length || 0)} کوپن
          {activeCount > 0 ? (
            <span className="text-foreground">
              {' '}
              · {formatNumber(activeCount)} فعال
            </span>
          ) : null}
        </p>
      </div>

      <div className="space-y-3">
        {(listQuery.data || []).map((c) => (
          <AdminSurface
            key={c.id}
            className={cn(
              'transition-opacity',
              !c.is_active && 'opacity-75'
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className="font-black tracking-[0.12em] text-foreground"
                    dir="ltr"
                  >
                    {c.code}
                  </p>
                  <AdminStatusBadge tone={c.is_active ? 'success' : 'neutral'}>
                    {c.is_active ? 'فعال' : 'غیرفعال'}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="primary">{discountLabel(c)}</AdminStatusBadge>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  استفاده: {formatNumber(c.used_count)}
                  {c.max_uses != null ? ` / ${formatNumber(c.max_uses)}` : ' / نامحدود'}
                  {c.min_order_amount > 0
                    ? ` · حداقل سفارش ${formatCurrency(c.min_order_amount)}`
                    : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canManage ? (
                  <>
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-2xl border px-3 py-2',
                        c.is_active
                          ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                          : 'border-border bg-muted/40'
                      )}
                    >
                      <Switch
                        checked={c.is_active}
                        onChange={(v) =>
                          toggleMutation.mutate({ id: c.id, is_active: v })
                        }
                        disabled={toggleMutation.isPending}
                        label={c.is_active ? 'فعال' : 'غیرفعال'}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => startEdit(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      ویرایش
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('حذف این کوپن؟')) deleteMutation.mutate(c.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </AdminSurface>
        ))}

        {!listQuery.isLoading && !(listQuery.data || []).length ? (
          <AdminSurface>
            <AdminEmpty
              title="هنوز کوپنی تعریف نشده"
              description="اولین کد تخفیف را از فرم بالا بسازید."
            />
          </AdminSurface>
        ) : null}
      </div>
    </div>
  )
}
