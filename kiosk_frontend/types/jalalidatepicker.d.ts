declare module '@majidh1/jalalidatepicker' {
  interface JalaliDatePickerOptions {
    placeholderText?: string
    timePicker?: boolean
    dateFormat?: string
    autoClose?: boolean
    todayButton?: boolean
    clearButton?: boolean
    onChange?: (formatted: string) => void
  }

  interface JalaliDatePickerInstance {
    setDate: (date: string) => void
    getDate: () => string
    destroy: () => void
  }

  function jalaliDatepicker(
    element: HTMLElement,
    options?: JalaliDatePickerOptions
  ): JalaliDatePickerInstance

  export default jalaliDatepicker
}

