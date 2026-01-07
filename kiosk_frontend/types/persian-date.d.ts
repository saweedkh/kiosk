declare module 'persian-date' {
  class PersianDate {
    constructor(date?: Date | string | number | number[])
    format(format: string): string
    toDate(): Date
    year(): number
    year(value: number): PersianDate
    month(): number
    month(value: number): PersianDate
    date(): number
    date(value: number): PersianDate
    hour(): number
    minute(): number
    second(): number
  }
  export = PersianDate
}

