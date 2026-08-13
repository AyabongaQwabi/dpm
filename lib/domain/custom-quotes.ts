export interface QuoteLineItemInput {
  description: string
  quantity: number
  unitPrice: number
}

export interface QuoteLineItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface QuoteLineItemsResult {
  ok: boolean
  lineItems?: QuoteLineItem[]
  totalAmount?: number
  error?: string
}

export function normaliseQuoteLineItems(params: {
  rawItems: unknown
  minItems: number
  maxItems: number
}): QuoteLineItemsResult {
  if (!Array.isArray(params.rawItems)) {
    return { ok: false, error: 'Quote line items are invalid.' }
  }

  const lineItems: QuoteLineItemInput[] = []
  for (const item of params.rawItems) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Every line item needs a description, quantity, and unit price.' }
    }
    const record = item as Record<string, unknown>
    const description = String(record.description ?? '').trim()
    const quantity = Number(record.quantity)
    const unitPrice = Math.round(Number(record.unitPrice ?? record.unit_price))

    if (!description || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      return { ok: false, error: 'Every line item needs a description, quantity, and unit price.' }
    }

    lineItems.push({
      description,
      quantity,
      unitPrice,
    })
  }

  if (lineItems.length < params.minItems) {
    return { ok: false, error: 'Add at least one line item.' }
  }
  if (lineItems.length > params.maxItems) {
    return { ok: false, error: `Use ${params.maxItems} line items or fewer.` }
  }

  const normalised: QuoteLineItem[] = []
  for (const item of lineItems) {
    if (item.quantity <= 0) {
      return { ok: false, error: 'Quantities must be greater than zero.' }
    }
    if (item.unitPrice <= 0) {
      return { ok: false, error: 'Unit prices must be greater than zero.' }
    }

    const lineTotal = Math.round(item.quantity * item.unitPrice)
    if (lineTotal <= 0) {
      return { ok: false, error: 'Line item totals must be greater than zero.' }
    }

    normalised.push({
      description: item.description.slice(0, 240),
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: lineTotal,
    })
  }

  const totalAmount = normalised.reduce((sum, item) => sum + item.line_total, 0)
  if (totalAmount <= 0) {
    return { ok: false, error: 'Quote total must be greater than zero.' }
  }

  return { ok: true, lineItems: normalised, totalAmount }
}

export function defaultQuoteValidityDate(days: number, now = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}
