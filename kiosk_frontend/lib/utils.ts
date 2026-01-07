import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  // اطمینان از اینکه مبلغ عدد صحیح است
  const roundedAmount = Math.round(amount)
  const formatted = new Intl.NumberFormat('fa-IR', {
    style: 'currency',
    currency: 'IRR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount)
  // اطمینان از تبدیل اعداد به فارسی
  return toPersianDigits(formatted)
}

export function formatNumber(num: number): string {
  const formatted = new Intl.NumberFormat('fa-IR').format(num)
  // اطمینان از تبدیل اعداد به فارسی
  return toPersianDigits(formatted)
}

/**
 * تبدیل اعداد انگلیسی به فارسی
 */
export function toPersianDigits(str: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  
  let result = String(str)
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(englishDigits[i], 'g'), persianDigits[i])
  }
  return result
}

/**
 * تبدیل اعداد فارسی به انگلیسی
 */
export function toEnglishDigits(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  
  let result = String(str)
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i])
  }
  return result
}

/**
 * تبدیل ارورهای انگلیسی به فارسی برای نمایش به کاربر
 */
export function translateError(error: any): string {
  // اگر ارور از بک‌اند پیام فارسی دارد، از آن استفاده کن
  const persianMessage = 
    error?.response?.data?.messages?.non_field_errors?.[0] ||
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    ''

  // اگر پیام فارسی است، برگردان
  if (persianMessage && /[\u0600-\u06FF]/.test(persianMessage)) {
    return persianMessage
  }

  // تبدیل ارورهای رایج به فارسی
  const errorMessage = error?.response?.data?.detail || error?.message || ''
  const statusCode = error?.response?.status

  // ارورهای بر اساس status code
  if (statusCode === 500) {
    return 'خطای سرور. لطفا بعدا دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.'
  }
  if (statusCode === 404) {
    return 'مورد درخواستی یافت نشد.'
  }
  if (statusCode === 403) {
    return 'شما دسترسی لازم برای انجام این عملیات را ندارید.'
  }
  if (statusCode === 401) {
    return 'لطفا دوباره وارد سیستم شوید.'
  }
  if (statusCode === 400) {
    return 'درخواست نامعتبر است. لطفا اطلاعات را بررسی کنید.'
  }

  // ارورهای بر اساس متن
  const errorLower = errorMessage.toLowerCase()
  
  if (errorLower.includes('network') || errorLower.includes('timeout') || errorLower.includes('econnaborted')) {
    return 'خطا در اتصال به سرور. لطفا اتصال اینترنت خود را بررسی کنید.'
  }
  if (errorLower.includes('cannot delete') || errorLower.includes('foreign key')) {
    return 'این مورد قابل حذف نیست زیرا در حال استفاده است.'
  }
  if (errorLower.includes('not found')) {
    return 'مورد درخواستی یافت نشد.'
  }
  if (errorLower.includes('permission') || errorLower.includes('forbidden')) {
    return 'شما دسترسی لازم برای انجام این عملیات را ندارید.'
  }
  if (errorLower.includes('unauthorized') || errorLower.includes('authentication')) {
    return 'لطفا دوباره وارد سیستم شوید.'
  }
  if (errorLower.includes('validation') || errorLower.includes('invalid')) {
    return 'اطلاعات وارد شده نامعتبر است. لطفا دوباره بررسی کنید.'
  }

  // اگر هیچ کدام تطبیق نداشت، پیام پیش‌فرض
  if (errorMessage) {
    return `خطا: ${errorMessage}`
  }

  return 'خطای نامشخصی رخ داد. لطفا دوباره تلاش کنید.'
}

