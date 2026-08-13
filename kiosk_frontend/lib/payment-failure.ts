export type PaymentFailureKind =
  | 'insufficient_funds'
  | 'wrong_pin'
  | 'cancelled'
  | 'timeout'
  | 'other'

type ResolveInput = {
  paymentStatus?: string
  paymentFailureKind?: string | null
  order?: { payment_status?: string; status?: string } | null
  message?: string
  gateway?: {
    response_code?: string
    response_message?: string
    status?: string
  } | null
}

const VALID_KINDS: PaymentFailureKind[] = [
  'insufficient_funds',
  'wrong_pin',
  'cancelled',
  'timeout',
  'other',
]

/** ISO 8583 / PNA: 51 = insufficient funds, 55 = wrong PIN. Also keep legacy 02/03. */
const INSUFFICIENT_FUNDS_CODES = new Set(['02', '51'])
const WRONG_PIN_CODES = new Set(['03', '55'])

function normalizeCode(code?: string | null): string {
  const text = String(code || '').trim()
  if (!text) return ''
  return text.length >= 2 ? text.slice(-2) : text
}

export function resolvePaymentFailureKind(input: ResolveInput): PaymentFailureKind {
  const code = normalizeCode(input.gateway?.response_code)
  const status = (
    input.paymentStatus ||
    input.order?.payment_status ||
    input.order?.status ||
    input.gateway?.status ||
    ''
  ).toLowerCase()
  const message = String(
    input.message || input.gateway?.response_message || ''
  ).toLowerCase()

  // Prefer POS response codes over a generic backend "other" hint — PNA uses
  // ISO 8583 51/55 which older classifiers mishandled.
  if (WRONG_PIN_CODES.has(code)) return 'wrong_pin'
  if (INSUFFICIENT_FUNDS_CODES.has(code)) return 'insufficient_funds'

  const hinted = input.paymentFailureKind
  if (
    hinted &&
    hinted !== 'other' &&
    VALID_KINDS.includes(hinted as PaymentFailureKind)
  ) {
    return hinted as PaymentFailureKind
  }

  if (status === 'cancelled' || message.includes('لغو') || message.includes('cancel')) {
    return 'cancelled'
  }

  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('no response') ||
    message.includes('زمان') ||
    message.includes('connect') ||
    message.includes('tcp') ||
    message.includes('network error') ||
    message.includes('اتصال')
  ) {
    return 'timeout'
  }

  if (
    message.includes('رمز اشتباه') ||
    message.includes('wrong pin') ||
    message.includes('incorrect pin') ||
    message.includes('invalid pin')
  ) {
    return 'wrong_pin'
  }

  if (
    message.includes('insufficient') ||
    message.includes('موجودی') ||
    message.includes('balance')
  ) {
    return 'insufficient_funds'
  }

  if (hinted && VALID_KINDS.includes(hinted as PaymentFailureKind)) {
    return hinted as PaymentFailureKind
  }

  return 'other'
}

/** Soft failures where the customer can retry without losing the cart. */
export function shouldKeepCartOnPaymentFailure(kind: PaymentFailureKind): boolean {
  return kind === 'insufficient_funds' || kind === 'wrong_pin'
}
