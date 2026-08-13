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

function collectMessageText(input: ResolveInput): string {
  const parts = [
    input.message,
    input.gateway?.response_message,
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
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
  const message = collectMessageText(input)

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
    message.includes('invalid pin') ||
    message.includes('pin error')
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

/** Flatten DRF CustomJSONRenderer error envelopes into usable fields. */
export function extractPaymentErrorPayload(responseData: unknown): {
  paymentFailureKind: string | null
  message: string
  order: {
    id?: number
    order_number?: string
    payment_status?: string
    status?: string
  } | null
  gateway: {
    response_code?: string
    response_message?: string
    status?: string
  } | null
} {
  const data = (responseData || {}) as Record<string, any>
  const messages = (data.messages || {}) as Record<string, any>
  const result =
    data.result && !Array.isArray(data.result) ? (data.result as Record<string, any>) : null

  const order =
    (messages.order as any) ||
    (result?.order as any) ||
    (data.order as any) ||
    null

  const gateway =
    (messages.gateway as any) ||
    (result?.gateway as any) ||
    (data.gateway as any) ||
    null

  let paymentFailureKind: string | null =
    (typeof messages.payment_failure_kind === 'string' && messages.payment_failure_kind) ||
    (typeof result?.payment_failure_kind === 'string' && result.payment_failure_kind) ||
    (typeof data.payment_failure_kind === 'string' && data.payment_failure_kind) ||
    null

  const messageParts: string[] = []
  const pushText = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) messageParts.push(value)
  }

  pushText(messages.message)
  pushText(messages.error)
  pushText(result?.message)
  pushText(result?.error)
  pushText(data.message)
  pushText(data.error)
  pushText(gateway?.response_message)

  const nonField = messages.non_field_errors
  if (Array.isArray(nonField)) {
    for (const item of nonField) {
      if (typeof item === 'string') {
        pushText(item)
        if (
          !paymentFailureKind &&
          VALID_KINDS.includes(item as PaymentFailureKind)
        ) {
          paymentFailureKind = item
        }
      }
    }
  }

  return {
    paymentFailureKind,
    message: messageParts.join(' '),
    order,
    gateway,
  }
}
