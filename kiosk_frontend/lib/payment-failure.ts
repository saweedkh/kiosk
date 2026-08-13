export type PaymentFailureKind =
  | 'insufficient_funds'
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
  'cancelled',
  'timeout',
  'other',
]

function normalizeCode(code?: string | null): string {
  const text = String(code || '').trim()
  if (!text) return ''
  return text.length >= 2 ? text.slice(-2) : text
}

export function resolvePaymentFailureKind(input: ResolveInput): PaymentFailureKind {
  const hinted = input.paymentFailureKind
  if (hinted && VALID_KINDS.includes(hinted as PaymentFailureKind)) {
    return hinted as PaymentFailureKind
  }

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

  const code = normalizeCode(input.gateway?.response_code)
  if (
    code === '02' ||
    message.includes('insufficient') ||
    message.includes('موجودی') ||
    message.includes('balance')
  ) {
    return 'insufficient_funds'
  }

  return 'other'
}

export function shouldKeepCartOnPaymentFailure(kind: PaymentFailureKind): boolean {
  return kind === 'insufficient_funds'
}
