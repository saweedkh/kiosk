// استفاده از moment-jalaali و persian-date برای تبدیل دقیق تاریخ شمسی
import moment from 'moment-jalaali'
import PersianDate from 'persian-date'
import { toPersianDigits, toEnglishDigits } from '../utils'

/**
 * تبدیل تاریخ میلادی به شمسی و فرمت کردن
 */
export function formatJalaliDate(date: Date | string): string {
  try {
    // Ensure we have a valid Date object
    let dateObj: Date
    if (typeof date === 'string') {
      // اگر string است، سعی می‌کنیم آن را parse کنیم
      dateObj = new Date(date)
    } else {
      dateObj = date
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date)
      return ''
    }
    
    // استفاده از moment-jalaali برای تبدیل دقیق
    // moment-jalaali به صورت خودکار تاریخ میلادی را به شمسی تبدیل می‌کند
    // ابتدا باید moment را با تاریخ میلادی بسازیم
    const miladiMoment = moment(dateObj)
    
    // بررسی معتبر بودن
    if (!miladiMoment.isValid()) {
      console.error('Invalid moment date:', date, 'Date object:', dateObj)
      return ''
    }
    
    // فرمت کردن به شمسی با استفاده از j prefix
    // moment-jalaali به صورت خودکار تاریخ میلادی را به شمسی تبدیل می‌کند
    const formatted = miladiMoment.format('jYYYY/jMM/jDD')
    // تبدیل اعداد به فارسی
    return toPersianDigits(formatted)
  } catch (error) {
    console.error('Error formatting Jalali date:', error, date)
    return ''
  }
}

/**
 * تبدیل تاریخ و زمان میلادی به شمسی و فرمت کردن
 */
export function formatJalaliDateTime(date: Date | string): string {
  try {
    // Ensure we have a valid Date object
    let dateObj: Date
    if (typeof date === 'string') {
      // اگر string است، سعی می‌کنیم آن را parse کنیم
      dateObj = new Date(date)
    } else {
      dateObj = date
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date)
      return ''
    }
    
    // استفاده از jalali-moment برای تبدیل دقیق
    const miladiMoment = moment(dateObj)
    
    // بررسی معتبر بودن
    if (!miladiMoment.isValid()) {
      console.error('Invalid moment date:', date, 'Date object:', dateObj)
      return ''
    }
    
    // فرمت کردن به شمسی با استفاده از j prefix
    const formatted = miladiMoment.format('jYYYY/jMM/jDD HH:mm:ss')
    // تبدیل اعداد به فارسی
    return toPersianDigits(formatted)
  } catch (error) {
    console.error('Error formatting Jalali date time:', error, date)
    return ''
  }
}

/**
 * دریافت تاریخ امروز به شمسی
 */
export function getTodayJalali(): string {
  return formatJalaliDate(new Date())
}

/**
 * دریافت زمان تهران
 */
export function getTehranTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tehran' }))
}

/**
 * فرمت کردن زمان
 */
export function formatTime(date: Date | string): string {
  try {
    // Ensure we have a valid Date object
    let dateObj: Date
    if (typeof date === 'string') {
      dateObj = new Date(date)
    } else {
      dateObj = date
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date)
      return ''
    }
    
    // استفاده از moment-jalaali برای تبدیل دقیق
    const jalaliMoment = moment(dateObj)
    
    // بررسی معتبر بودن
    if (!jalaliMoment.isValid()) {
      console.error('Invalid moment date:', date)
      return ''
    }
    
    // فرمت کردن زمان (زمان در هر دو تقویم یکسان است)
    const formatted = jalaliMoment.format('HH:mm')
    // تبدیل اعداد به فارسی
    return toPersianDigits(formatted)
  } catch (error) {
    console.error('Error formatting time:', error, date)
    return ''
  }
}

/**
 * تبدیل تاریخ شمسی به میلادی با استفاده از moment-jalaali
 * ورودی: تاریخ شمسی به فرمت YYYY/MM/DD (مثلاً 1403/01/15)
 * خروجی: تاریخ میلادی به فرمت YYYY-MM-DD (مثلاً 2024-04-04)
 */
export function convertJalaliToMiladi(jalaliDate: string): string {
  // بررسی خالی بودن یا null بودن
  if (!jalaliDate || typeof jalaliDate !== 'string' || jalaliDate.trim() === '') {
    return ''
  }
  
  const trimmedDate = jalaliDate.trim()
  
  // تبدیل اعداد فارسی به انگلیسی برای پردازش
  const englishDate = toEnglishDigits(trimmedDate)
  
  // بررسی فرمت تاریخ (باید به صورت YYYY/MM/DD باشد)
  const datePattern = /^\d{4}\/\d{2}\/\d{2}$/
  if (!datePattern.test(englishDate)) {
    console.error('Invalid Jalali date format:', jalaliDate)
    return ''
  }
  
  try {
    // Parse تاریخ شمسی
    const [year, month, day] = englishDate.split('/').map(Number)
    
    // بررسی معتبر بودن اعداد
    if (!year || !month || !day || year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1 || day > 31) {
      console.error('Invalid Jalali date values:', { year, month, day })
      return ''
    }
    
    // استفاده از moment-jalaali برای تبدیل دقیق
    // moment-jalaali می‌تواند با فرمت jYYYY/jMM/jDD استفاده شود
    const jalaliMoment = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD')
    
    // بررسی معتبر بودن تاریخ
    if (!jalaliMoment.isValid()) {
      console.error('Invalid Jalali date:', jalaliDate, 'Parsed:', { year, month, day })
      return ''
    }
    
    // تبدیل به میلادی - moment-jalaali به صورت خودکار تاریخ شمسی را به میلادی تبدیل می‌کند
    // استفاده از format با YYYY-MM-DD برای دریافت تاریخ میلادی
    // این روش دقیق‌تر است و مشکل timezone ندارد
    const formatted = jalaliMoment.format('YYYY-MM-DD')
    
    // Log برای debug
    console.log('Date conversion:', { 
      jalali: jalaliDate, 
      parsed: { year, month, day }, 
      miladi: formatted 
    })
    
    // بررسی اینکه تاریخ معتبر است (باید بین 1900 تا 2100 باشد)
    const yearMiladi = jalaliMoment.year()
    if (yearMiladi < 1900 || yearMiladi > 2100) {
      console.error('Invalid date conversion result:', formatted, 'from:', jalaliDate)
      return ''
    }
    
    return formatted
  } catch (error) {
    console.error('Error converting Jalali to Miladi:', error, 'input:', jalaliDate)
    return ''
  }
}

/**
 * تبدیل تاریخ میلادی به شمسی (برای استفاده در DatePicker)
 * ورودی: تاریخ میلادی به فرمت YYYY-MM-DD
 * خروجی: تاریخ شمسی به فرمت YYYY/MM/DD
 */
export function convertMiladiToJalali(miladiDate: string): string {
  if (!miladiDate || typeof miladiDate !== 'string' || miladiDate.trim() === '') {
    return ''
  }
  
  try {
    // استفاده از jalali-moment برای تبدیل میلادی به شمسی
    const miladiMoment = moment(miladiDate, 'YYYY-MM-DD')
    if (!miladiMoment.isValid()) {
      console.error('Invalid Miladi date:', miladiDate)
      return ''
    }
    
    // فرمت کردن به شمسی
    const formatted = miladiMoment.format('jYYYY/jMM/jDD')
    return toPersianDigits(formatted)
  } catch (error) {
    console.error('Error converting Miladi to Jalali:', error, 'input:', miladiDate)
    return ''
  }
}
