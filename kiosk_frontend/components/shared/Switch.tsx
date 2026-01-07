'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, label, disabled = false, className }, ref) => {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            checked
              ? 'bg-primary dark:bg-primary'
              : 'bg-gray-300 dark:bg-gray-600'
          )}
        >
          <span
            className={cn(
              'pointer-events-none absolute inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-all duration-200 ease-in-out',
              checked ? 'right-0.5' : 'left-0.5'
            )}
            aria-hidden="true"
          />
        </button>
        {label && (
          <label
            className={cn(
              'text-sm font-medium cursor-pointer select-none',
              disabled && 'opacity-50 cursor-not-allowed',
              checked
                ? 'text-text dark:text-text-dark'
                : 'text-text-secondary dark:text-gray-400'
            )}
            onClick={() => !disabled && onChange(!checked)}
          >
            {checked ? 'فعال' : 'غیرفعال'}
          </label>
        )}
      </div>
    )
  }
)

Switch.displayName = 'Switch'

