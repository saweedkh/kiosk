'use client'

import { useEffect, useRef, forwardRef, useCallback } from 'react'
import { CalendarDays } from 'lucide-react'
import { toPersianDigits, toEnglishDigits } from '@/lib/utils'
import { PickerFieldTrigger } from '@/components/admin/PickerFieldTrigger'

interface DatePickerProps {
  label: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  name?: string
  error?: string
  placeholder?: string
  className?: string
}

function positionJdpUnderAnchor(anchor: HTMLElement) {
  const cal = document.querySelector('.jdp-container') as HTMLElement | null
  if (!cal) return

  const rect = anchor.getBoundingClientRect()
  const calWidth = cal.offsetWidth || 300
  const calHeight = cal.offsetHeight || 320
  const gap = 8

  // Align calendar to the field (prefer under it, start from field left edge).
  let left = rect.left
  if (left + calWidth > window.innerWidth - gap) {
    left = window.innerWidth - calWidth - gap
  }
  left = Math.max(gap, left)

  let top = rect.bottom + gap
  if (top + calHeight > window.innerHeight - gap) {
    top = Math.max(gap, rect.top - calHeight - gap)
  }

  cal.style.setProperty('position', 'fixed', 'important')
  cal.style.setProperty('left', `${Math.round(left)}px`, 'important')
  cal.style.setProperty('top', `${Math.round(top)}px`, 'important')
  cal.style.setProperty('right', 'auto', 'important')
  cal.style.setProperty('transform', 'none', 'important')
  cal.style.setProperty('margin', '0', 'important')
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      value,
      onChange,
      onBlur,
      name,
      error,
      placeholder = 'تاریخ را انتخاب کنید',
      className,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const anchorRef = useRef<HTMLDivElement | null>(null)
    const scriptsLoadedRef = useRef(false)

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
      },
      [ref]
    )

    const reposition = useCallback(() => {
      if (anchorRef.current) positionJdpUnderAnchor(anchorRef.current)
    }, [])

    useEffect(() => {
      if (typeof window === 'undefined' || !inputRef.current) return

      const loadScripts = () => {
        return new Promise<void>((resolve, reject) => {
          if ((window as any).jalaliDatepicker) {
            resolve()
            return
          }

          if (scriptsLoadedRef.current) {
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

          const cssLink = document.createElement('link')
          cssLink.rel = 'stylesheet'
          cssLink.href = window.location.origin + '/js/jalalidatepicker.min.css'
          cssLink.onerror = () => {
            const currentPath = window.location.pathname
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'))
            cssLink.href = basePath + '/js/jalalidatepicker.min.css'
          }
          document.head.appendChild(cssLink)

          const script = document.createElement('script')
          script.src = window.location.origin + '/js/jalalidatepicker.min.js'
          script.onload = () => {
            scriptsLoadedRef.current = false
            resolve()
          }
          script.onerror = () => {
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
      let handleShow: (() => void) | null = null

      loadScripts()
        .then(() => {
          const jalaliDatepickerObj = (window as any).jalaliDatepicker

          if (!jalaliDatepickerObj || typeof jalaliDatepickerObj !== 'object') {
            console.error('jalaliDatepicker is not available')
            return
          }

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

          inputRef.current.setAttribute('data-jdp', '')
          if (value) {
            inputRef.current.value = toEnglishDigits(value)
          }

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

          handleShow = () => {
            requestAnimationFrame(() => {
              reposition()
              // Library sometimes repositions after paint.
              setTimeout(reposition, 0)
              setTimeout(reposition, 50)
            })
          }

          inputRef.current.addEventListener('jdp:change', handleChange)
          inputRef.current.addEventListener('change', handleChange)
          inputRef.current.addEventListener('jdp:show', handleShow)
          inputRef.current.addEventListener('focus', handleShow)
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
        if (inputRef.current && handleShow) {
          inputRef.current.removeEventListener('jdp:show', handleShow)
          inputRef.current.removeEventListener('focus', handleShow)
        }
      }
    }, [value, placeholder, onChange, name, reposition])

    useEffect(() => {
      if (inputRef.current && value !== undefined) {
        inputRef.current.value = toEnglishDigits(value || '')
      }
    }, [value])

    const empty = !value || value.trim() === ''
    const display = empty ? '' : toPersianDigits(toEnglishDigits(value))

    return (
      <PickerFieldTrigger
        label={label}
        icon={<CalendarDays className="h-4 w-4" />}
        display={display}
        empty={empty}
        placeholder={placeholder}
        error={error}
        className={className}
        triggerRef={anchorRef}
        overlay={
          <input
            ref={setRefs}
            type="text"
            name={name}
            readOnly
            onBlur={onBlur}
            defaultValue={value ? toEnglishDigits(value) : ''}
            className="h-full w-full cursor-pointer border-0 bg-transparent caret-transparent text-transparent outline-none"
            data-jdp=""
            aria-label={label}
          />
        }
      />
    )
  }
)

DatePicker.displayName = 'DatePicker'
