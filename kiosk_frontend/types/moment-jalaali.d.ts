declare module 'moment-jalaali' {
  import moment from 'moment'
  
  interface MomentJalaali extends moment.Moment {
    format(format?: string): string
  }
  
  function momentJalaali(input?: string | Date, format?: string): MomentJalaali
  
  namespace momentJalaali {
    function format(input: string | Date, format: string): string
  }
  
  export = momentJalaali
}

