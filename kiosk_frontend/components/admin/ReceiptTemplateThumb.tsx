'use client'

import { cn } from '@/lib/utils'

export type ReceiptTemplateId =
  | 'modern'
  | 'classic'
  | 'minimal'
  | 'elegant'
  | 'bold'
  | 'ticket'
  | 'market'
  | 'banner'

/** Tiny thermal-receipt mock for template picker */
export function ReceiptTemplateThumb({
  template,
  className,
}: {
  template: ReceiptTemplateId | string
  className?: string
}) {
  const base = 'relative h-full w-full overflow-hidden bg-[#f7f4ef] text-[5px] leading-tight text-black'

  if (template === 'classic') {
    return (
      <div className={cn(base, className)}>
        <div className="bg-black px-1.5 py-1 text-center text-white">فروشگاه</div>
        <div className="space-y-0.5 p-1.5">
          <div className="h-1 w-full bg-black/20" />
          <div className="grid grid-cols-3 gap-0.5">
            <div className="h-1 bg-black/30" />
            <div className="h-1 bg-black/30" />
            <div className="h-1 bg-black/30" />
          </div>
          <div className="h-1 w-full bg-black/10" />
          <div className="h-1 w-full bg-black/10" />
          <div className="mt-1 h-2 bg-black text-[4px] text-white" />
        </div>
      </div>
    )
  }

  if (template === 'minimal') {
    return (
      <div className={cn(base, 'flex flex-col items-center gap-1 p-2', className)}>
        <div className="h-1.5 w-10 bg-black/80" />
        <div className="h-px w-8 bg-black/20" />
        <div className="h-1 w-12 bg-black/15" />
        <div className="h-1 w-10 bg-black/15" />
        <div className="mt-auto h-1.5 w-14 bg-black/70" />
      </div>
    )
  }

  if (template === 'elegant') {
    return (
      <div className={cn(base, className)}>
        <div className="bg-black px-1 py-2 text-center">
          <div className="mx-auto h-1.5 w-8 bg-white/90" />
          <div className="mx-auto mt-1 h-0.5 w-6 bg-white/40" />
        </div>
        <div className="space-y-1 p-1.5">
          <div className="flex justify-between gap-1">
            <div className="h-1 w-6 bg-black/20" />
            <div className="h-1 w-4 bg-black/40" />
          </div>
          <div className="flex justify-between gap-1">
            <div className="h-1 w-7 bg-black/20" />
            <div className="h-1 w-3 bg-black/40" />
          </div>
          <div className="mt-1 border border-black/40 p-1">
            <div className="h-1.5 w-full bg-black/70" />
          </div>
        </div>
      </div>
    )
  }

  if (template === 'bold') {
    return (
      <div className={cn(base, 'border-[3px] border-black p-1', className)}>
        <div className="text-center text-[7px] font-black">۱۲۳</div>
        <div className="my-1 h-1 bg-black" />
        <div className="space-y-0.5">
          <div className="h-1.5 w-full bg-black/25" />
          <div className="h-1.5 w-full bg-black/25" />
        </div>
        <div className="mt-1 h-3 w-full bg-black" />
      </div>
    )
  }

  if (template === 'ticket') {
    return (
      <div className={cn(base, className)}>
        <div
          className="absolute inset-y-0 start-0 w-1.5"
          style={{
            background:
              'radial-gradient(circle at 0 4px, transparent 3px, #f7f4ef 3.5px) 0 0 / 100% 10px',
          }}
        />
        <div className="ps-2.5 pe-1.5 pt-2">
          <div className="h-1.5 w-10 bg-black/80" />
          <div className="mt-2 border border-dashed border-black/30 p-1">
            <div className="text-center text-[8px] font-black">۰۴۲</div>
          </div>
          <div className="mt-2 h-1 w-full bg-black/15" />
        </div>
      </div>
    )
  }

  if (template === 'market') {
    return (
      <div className={cn(base, 'p-1.5', className)}>
        <div className="mb-1 h-1.5 w-full bg-black/70" />
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-1 gap-y-0.5">
          <div className="h-1 bg-black/20" />
          <div className="h-1 w-2 bg-black/30" />
          <div className="h-1 w-3 bg-black/40" />
          <div className="h-1 bg-black/20" />
          <div className="h-1 w-2 bg-black/30" />
          <div className="h-1 w-3 bg-black/40" />
          <div className="h-1 bg-black/20" />
          <div className="h-1 w-2 bg-black/30" />
          <div className="h-1 w-3 bg-black/40" />
        </div>
        <div className="mt-1.5 flex justify-between border-t border-black pt-1">
          <div className="h-1.5 w-4 bg-black" />
          <div className="h-1.5 w-5 bg-black" />
        </div>
      </div>
    )
  }

  if (template === 'banner') {
    return (
      <div className={cn(base, className)}>
        <div className="h-4 bg-black" />
        <div className="space-y-0.5 p-1.5">
          <div className="h-1.5 w-full bg-black/[0.08]" />
          <div className="h-1.5 w-full bg-black/[0.14]" />
          <div className="h-1.5 w-full bg-black/[0.08]" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-3 bg-black" />
      </div>
    )
  }

  // modern (default)
  return (
    <div className={cn(base, 'flex flex-col p-1.5', className)}>
      <div className="mx-auto h-1.5 w-9 bg-black/70" />
      <div className="mx-auto mt-2 text-[9px] font-black tracking-wider">۰۰۸</div>
      <div className="mx-auto mt-1 h-px w-10 bg-black/30" />
      <div className="mt-2 space-y-0.5">
        <div className="h-1 w-full bg-black/15" />
        <div className="h-1 w-full bg-black/15" />
      </div>
      <div className="mt-auto h-2.5 w-full bg-black text-center text-[4px] leading-[10px] text-white">
        مبلغ
      </div>
    </div>
  )
}

/** Larger live-ish preview for settings panel */
export function ReceiptLivePreview({
  template,
  header,
  footer,
  siteName,
  nextNumber,
  copyMode,
}: {
  template: string
  header?: string
  footer?: string
  siteName?: string
  nextNumber?: number
  copyMode?: string
}) {
  const title = (header || '').trim() || (siteName || '').trim() || 'فروشگاه'
  const foot = (footer || '').trim() || 'ممنون از خرید شما'
  const num = String(nextNumber ?? 1).padStart(3, '0')
  const isTicket = template === 'ticket'
  const isBanner = template === 'banner'
  const isElegant = template === 'elegant'
  const isBold = template === 'bold'

  return (
    <div className="relative mx-auto w-full max-w-[200px]">
      <div
        className={cn(
          'relative overflow-hidden rounded-sm bg-[#faf7f2] text-black shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5',
          isBold && 'ring-2 ring-black'
        )}
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0, transparent calc(100% - 1px), rgba(0,0,0,0.03) calc(100% - 1px))',
        }}
      >
        {/* perforated edge */}
        <div
          aria-hidden
          className="absolute inset-y-0 -start-1.5 w-3"
          style={{
            background:
              'radial-gradient(circle at center, transparent 3px, #faf7f2 3.5px) center / 100% 12px',
          }}
        />

        {(isBanner || isElegant) && (
          <div className="bg-black px-3 py-3 text-center text-white">
            <p className="text-xs font-black">{title}</p>
          </div>
        )}

        <div className="space-y-3 px-4 py-4">
          {!isBanner && !isElegant && (
            <div className="text-center">
              <p className={cn('font-black', isBold ? 'text-base' : 'text-sm')}>{title}</p>
              <div className="mx-auto mt-2 h-px w-12 bg-black/25" />
            </div>
          )}

          {isTicket ? (
            <div className="rounded border border-dashed border-black/40 py-3 text-center">
              <p className="text-[10px] text-black/50">شماره</p>
              <p className="text-2xl font-black tracking-widest">{num}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[10px] text-black/45">شماره فیش</p>
              <p
                className={cn(
                  'font-black tracking-wider',
                  template === 'modern' || isBold ? 'text-2xl' : 'text-lg'
                )}
              >
                {num}
              </p>
            </div>
          )}

          <div className="space-y-1.5 border-y border-dashed border-black/20 py-2 text-[10px]">
            <div className="flex justify-between gap-2">
              <span className="text-black/55">آیتم نمونه</span>
              <span className="font-semibold">۱ × ۱۲۰٬۰۰۰</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-black/55">آیتم نمونه</span>
              <span className="font-semibold">۲ × ۸۵٬۰۰۰</span>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center justify-between px-2 py-2 text-xs font-black',
              template === 'modern' || isBanner || isBold
                ? 'bg-black text-white'
                : 'border border-black'
            )}
          >
            <span>جمع</span>
            <span>۲۹۰٬۰۰۰</span>
          </div>

          <p className="text-center text-[10px] leading-relaxed text-black/55">{foot}</p>

          {copyMode === 'dual' && (
            <p className="text-center text-[9px] font-medium text-black/35">
              نسخه مشتری / فروشنده
            </p>
          )}
        </div>

        {isBanner && <div className="h-3 bg-black" />}
      </div>
    </div>
  )
}
