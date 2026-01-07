'use client'

import { useEffect, useRef, forwardRef } from 'react'
import { Input } from '@/components/shared/Input'
import { toPersianDigits, toEnglishDigits } from '@/lib/utils'

interface DatePickerProps {
  label: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  name?: string
  error?: string
  placeholder?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, value, onChange, onBlur, name, error, placeholder = 'تاریخ را انتخاب کنید' }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const scriptsLoadedRef = useRef(false)

    useEffect(() => {
      if (typeof window === 'undefined' || !inputRef.current) return

      const loadScripts = () => {
        return new Promise<void>((resolve, reject) => {
          // بررسی کن که آیا script قبلاً load شده یا نه
          if ((window as any).jalaliDatepicker) {
            resolve()
            return
          }

          // بررسی کن که آیا script در حال load است یا نه
          if (scriptsLoadedRef.current) {
            // صبر کن تا script load شود
            const checkInterval = setInterval(() => {
              if ((window as any).jalaliDatepicker) {
                clearInterval(checkInterval)
                resolve()
              }
            }, 100)
            setTimeout(() => {
              clearInterval(checkInterval)
              if (!(window as any).jalaliDatepicker) {
                reject(new Error('Timeout loading jalaliDatepicker'))
              }
            }, 5000)
            return
          }

          scriptsLoadedRef.current = true

          // Load CSS - استفاده از path نسبی که در Django هم کار کند
          const cssLink = document.createElement('link')
          cssLink.rel = 'stylesheet'
          // استفاده از path مطلق که در Django هم کار کند
          // ابتدا از path مطلق root استفاده می‌کنیم
          cssLink.href = window.location.origin + '/js/jalalidatepicker.min.css'
          cssLink.onerror = () => {
            // اگر path اول کار نکرد، از path نسبی استفاده کن
            const currentPath = window.location.pathname
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'))
            cssLink.href = basePath + '/js/jalalidatepicker.min.css'
          }
          document.head.appendChild(cssLink)

          // Load JS - استفاده از path مطلق که در Django هم کار کند
          const script = document.createElement('script')
          script.src = window.location.origin + '/js/jalalidatepicker.min.js'
          script.onload = () => {
            scriptsLoadedRef.current = false
            resolve()
          }
          script.onerror = () => {
            // اگر path اول کار نکرد، از path نسبی استفاده کن
            const currentPath = window.location.pathname
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'))
            script.src = basePath + '/js/jalalidatepicker.min.js'
            script.onload = () => {
              scriptsLoadedRef.current = false
              resolve()
            }
            script.onerror = () => {
              scriptsLoadedRef.current = false
              reject(new Error('Failed to load jalaliDatepicker from both paths'))
            }
          }
          document.body.appendChild(script)
        })
      }

      let handleChange: ((e: Event) => void) | null = null

      loadScripts()
        .then(() => {
          const jalaliDatepickerObj = (window as any).jalaliDatepicker

          if (!jalaliDatepickerObj || typeof jalaliDatepickerObj !== 'object') {
            console.error('jalaliDatepicker is not available', {
              jalaliDatepickerObj,
              type: typeof jalaliDatepickerObj,
            })
            return
          }

          // Initialize jalali datepicker (فقط یک بار)
          if (!jalaliDatepickerObj.isInitialized) {
            jalaliDatepickerObj.startWatch({
              selector: 'input[data-jdp]',
              autoShow: true,
              autoHide: true,
              hideAfterChange: true,
              date: true,
              time: false,
              persianDigits: true,
              showTodayBtn: true,
              showEmptyBtn: true,
              showCloseBtn: true,
              topSpace: 8,
              bottomSpace: 8,
              overflowSpace: 8,
              zIndex: 9999,
            })
          }

          if (!inputRef.current) return

          // Set data attribute برای فعال کردن datepicker
          inputRef.current.setAttribute('data-jdp', '')
          if (value) {
            const englishValue = toEnglishDigits(value)
            inputRef.current.value = englishValue
          }

          // Listen for change event
          handleChange = (e: Event) => {
            const target = e.target as HTMLInputElement
            if (onChange && target === inputRef.current) {
              const persianFormatted = toPersianDigits(target.value)
              const syntheticEvent = {
                target: { value: persianFormatted },
              } as React.ChangeEvent<HTMLInputElement>
              onChange(syntheticEvent)
            }
          }

          inputRef.current.addEventListener('jdp:change', handleChange)
          inputRef.current.addEventListener('change', handleChange)
        })
        .catch((error) => {
          console.error('Error loading jalaliDatepicker:', error)
          scriptsLoadedRef.current = false
        })

      return () => {
        if (inputRef.current && handleChange) {
          inputRef.current.removeEventListener('jdp:change', handleChange)
          inputRef.current.removeEventListener('change', handleChange)
        }
      }
    }, [value, placeholder, onChange, name])

    return (
      <div className="w-full">
        <Input
          ref={inputRef}
          label={label}
          type="text"
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
          name={name}
          placeholder={(!value || value.trim() === '') ? placeholder : undefined}
          error={error}
          readOnly
        />
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'
