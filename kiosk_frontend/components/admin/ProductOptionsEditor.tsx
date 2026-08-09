'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productOptionsApi } from '@/lib/api/dashboard'
import { Button } from '@/components/shared/Button'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { ProductOptionGroup } from '@/types'

export function ProductOptionsEditor({
  productId,
  canEdit,
}: {
  productId: number
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const [groupName, setGroupName] = useState('سایز')
  const [optionName, setOptionName] = useState('')
  const [priceDelta, setPriceDelta] = useState(0)
  const [required, setRequired] = useState(true)
  const [error, setError] = useState('')

  const groupsQuery = useQuery({
    queryKey: ['product-option-groups', productId],
    queryFn: () => productOptionsApi.listGroups(productId),
    enabled: !!productId,
  })

  useEffect(() => {
    setError('')
  }, [productId])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!groupName.trim() || !optionName.trim()) {
        throw new Error('نام گروه و آپشن الزامی است')
      }
      return productOptionsApi.saveGroup(productId, {
        name: groupName.trim(),
        min_select: required ? 1 : 0,
        max_select: 1,
        is_required: required,
        display_order: (groupsQuery.data?.length || 0) + 1,
        is_active: true,
        options: [
          {
            name: optionName.trim(),
            price_delta: Number(priceDelta) || 0,
            display_order: 1,
            is_active: true,
          },
        ],
      })
    },
    onSuccess: () => {
      setOptionName('')
      setPriceDelta(0)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['product-option-groups', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err: any) => {
      setError(err?.message || 'خطا در ذخیره آپشن')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (groupId: number) => productOptionsApi.deleteGroup(productId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-option-groups', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const addOptionToGroup = async (group: ProductOptionGroup) => {
    const name = window.prompt('نام آپشن جدید؟')
    if (!name?.trim()) return
    const deltaRaw = window.prompt('تغییر قیمت (ریال، مثلاً 5000 یا 0)؟', '0')
    const delta = Number(deltaRaw || 0)
    try {
      await productOptionsApi.saveGroup(
        productId,
        {
          name: group.name,
          min_select: group.min_select,
          max_select: group.max_select,
          is_required: group.is_required,
          display_order: group.display_order,
          is_active: group.is_active !== false,
          options: [
            ...(group.options || []).map((o, idx) => ({
              name: o.name,
              price_delta: o.price_delta,
              display_order: o.display_order ?? idx + 1,
              is_active: o.is_active !== false,
            })),
            {
              name: name.trim(),
              price_delta: Number.isFinite(delta) ? delta : 0,
              display_order: (group.options?.length || 0) + 1,
              is_active: true,
            },
          ],
        },
        group.id
      )
      queryClient.invalidateQueries({ queryKey: ['product-option-groups', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (e: any) {
      setError(e?.message || 'خطا در افزودن آپشن')
    }
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <h4 className="mb-1 text-sm font-bold">آپشن‌های محصول</h4>
      <p className="mb-4 text-xs text-muted-foreground">
        مثلاً سایز یا افزودنی با تغییر قیمت روی فاکتور.
      </p>

      <div className="mb-4 space-y-2">
        {(groupsQuery.data || []).map((g) => (
          <div
            key={g.id}
            className="rounded-xl border border-border/80 bg-muted/30 px-3 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {g.name}
                {g.is_required ? (
                  <span className="ms-1 text-xs text-destructive">اجباری</span>
                ) : null}
              </p>
              {canEdit ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addOptionToGroup(g)}
                  >
                    + آپشن
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('حذف این گروه آپشن؟')) deleteMutation.mutate(g.id)
                    }}
                  >
                    حذف گروه
                  </Button>
                </div>
              ) : null}
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {(g.options || []).map((o) => (
                <li key={o.id}>
                  {o.name}
                  {o.price_delta
                    ? ` (${o.price_delta > 0 ? '+' : ''}${formatCurrency(o.price_delta)})`
                    : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!groupsQuery.isLoading && !(groupsQuery.data || []).length ? (
          <p className="text-sm text-muted-foreground">هنوز آپشنی تعریف نشده.</p>
        ) : null}
      </div>

      {canEdit ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">نام گروه</span>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">نام آپشن اول</span>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={optionName}
              onChange={(e) => setOptionName(e.target.value)}
              placeholder="مثلاً بزرگ"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">تغییر قیمت</span>
            <input
              type="number"
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={priceDelta}
              onChange={(e) => setPriceDelta(Number(e.target.value))}
            />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              گروه اجباری
            </label>
            <Button
              type="button"
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              ایجاد گروه
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {formatNumber(groupsQuery.data?.length || 0)} گروه آپشن
      </p>
    </div>
  )
}
