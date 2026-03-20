import { formatCurrencyToBrasilia } from '~/utils/money'

export type NormalizedLandingLot = {
  id: any
  name: string
  code: any
  lotDetails: {
    status: string
    tags: any[]
    [key: string]: any
  }
}

export function normalizeBlockLabel(value?: string | null): string {
  const block = String(value ?? '').trim()
  if (!block) return '---'

  const withoutPrefix = block.replace(/^quadra\s*/i, '').trim()
  return withoutPrefix || block
}

export function normalizeLotIdentifier(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function availableLotSlideKey(lot: any): string {
  return String(lot?.id || lot?.code || lot?.name || '')
}

export function normalizeLandingLot(lot: any): NormalizedLandingLot {
  return {
    id: lot?.id,
    name: lot?.name || lot?.code || 'Lote disponível',
    code: lot?.code || lot?.name || lot?.id,
    lotDetails: {
      ...(lot?.lotDetails || {}),
      status: String(lot?.lotDetails?.status || 'AVAILABLE').toUpperCase(),
      tags: Array.isArray(lot?.lotDetails?.tags) ? lot.lotDetails.tags : [],
    },
  }
}

export function featuredLotsStatusLabel(lot: any): string {
  switch (String(lot?.lotDetails?.status || '').toUpperCase()) {
    case 'AVAILABLE': return 'Disponível'
    case 'RESERVED': return 'Reservado'
    case 'SOLD': return 'Vendido'
    default: return 'Destaque'
  }
}

export function featuredLotsStatusClass(lot: any): string {
  switch (String(lot?.lotDetails?.status || '').toUpperCase()) {
    case 'AVAILABLE': return 'v4-lot-status--available'
    case 'RESERVED': return 'v4-lot-status--reserved'
    case 'SOLD': return 'v4-lot-status--sold'
    default: return 'v4-lot-status--featured'
  }
}

export function resolveLandingLotDisplayName(lot: any): string {
  const name = String(lot?.name || '').trim()
  const code = String(lot?.code || '').trim()
  const lotNumber = String(lot?.lotDetails?.lotNumber || '').trim()

  if (name && normalizeLotIdentifier(name) !== normalizeLotIdentifier(code)) return name
  if (lotNumber) return `Lote ${lotNumber}`
  if (code) return code
  if (name) return name
  return 'Lote disponível'
}

export function resolveLandingLotSecondaryLabel(lot: any): string {
  const code = String(lot?.code || '').trim()
  const displayName = resolveLandingLotDisplayName(lot)

  if (code && normalizeLotIdentifier(code) !== normalizeLotIdentifier(displayName)) {
    return code
  }

  return ''
}

export function formatLandingLotMeta(lot: any): string {
  const parts: string[] = []
  const block = normalizeBlockLabel(lot?.lotDetails?.block)
  const lotNumber = String(lot?.lotDetails?.lotNumber || '').trim()

  if (block !== '---') parts.push(`Quadra ${block}`)
  if (lotNumber) parts.push(`Lote ${lotNumber}`)

  return parts.length ? parts.join(' · ') : ''
}

export function mergeLandingLots(current: any[], incoming: any[]): any[] {
  const merged = new Map<string, any>()

  for (const lot of [...current, ...incoming]) {
    const key = availableLotSlideKey(lot)
    if (!key || merged.has(key)) continue
    merged.set(key, normalizeLandingLot(lot))
  }

  return Array.from(merged.values())
}

export function resolveLandingLotAreaValue(lot: any): number | null {
  const candidates = [
    lot?.lotDetails?.areaM2,
    lot?.lotDetails?.totalAreaM2,
    lot?.areaM2,
    lot?.area,
  ]

  for (const candidate of candidates) {
    const area = Number(candidate)
    if (Number.isFinite(area) && area > 0) return area
  }

  return null
}

export function resolveLandingLotPriceValue(lot: any): number | null {
  const directCandidates = [
    lot?.lotDetails?.price,
    lot?.lotDetails?.totalPrice,
    lot?.price,
  ]

  for (const candidate of directCandidates) {
    const price = Number(candidate)
    if (Number.isFinite(price) && price > 0) return price
  }

  const area = resolveLandingLotAreaValue(lot)
  const pricePerM2Candidates = [lot?.lotDetails?.pricePerM2, lot?.pricePerM2]

  for (const candidate of pricePerM2Candidates) {
    const pricePerM2 = Number(candidate)
    if (Number.isFinite(pricePerM2) && pricePerM2 > 0 && area) {
      return pricePerM2 * area
    }
  }

  return null
}

export function formatLandingLotArea(lot: any): string {
  const area = resolveLandingLotAreaValue(lot) ?? Number.NaN
  if (!Number.isFinite(area) || area <= 0) return 'Sob consulta'

  return `${area.toLocaleString('pt-BR', { minimumFractionDigits: area % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} m²`
}

export function formatLandingLotPrice(lot: any): string {
  const price = resolveLandingLotPriceValue(lot) ?? Number.NaN
  if (!Number.isFinite(price) || price <= 0) return 'Sob consulta'
  return formatCurrencyToBrasilia(price)
}

/**
 * Standard Brazilian real estate area: (average width) * (average depth)
 * or weighted scale average for polygons.
 */
export function calcContractArea(lot: any): number | null {
  const poly: Array<{x:number,y:number}> = lot.polygon ?? []
  if (poly.length < 2) return null

  const lengths = poly.map((p: any, i: number) => {
    const q = poly[(i + 1) % poly.length]!
    return Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
  })
  const sm: Array<{meters: number | null}> = lot.sideMetrics ?? []

  // Case: All 4 sides defined (most common and precise)
  const m = sm.map(s => s.meters)
  if (sm.length === 4 && m.every(v => v !== null && v > 0)) {
    return ((m[0]! + m[2]!) / 2) * ((m[1]! + m[3]!) / 2)
  }

  const scales: (number | null)[] = lengths.map((len: number, i: number) => {
    const mv = sm[i]?.meters
    return (mv != null && mv > 0 && len > 0) ? mv / len : null
  })

  const validScales = scales.filter((s): s is number => s !== null)
  const minRequired = Math.max(1, Math.ceil(sm.length * 0.5))
  if (validScales.length < minRequired) return null

  if (sm.length === 4) {
    const s0 = scales[0] ?? null, s1 = scales[1] ?? null, s2 = scales[2] ?? null, s3 = scales[3] ?? null
    const getAvg = (a: number | null, b: number | null) => {
      if (a != null && b != null) return (a + b) / 2
      return a ?? b ?? null
    }
    const sw = getAvg(s0, s2)
    const sd = getAvg(s1, s3)
    if (sw != null && sd != null) return (lot.area ?? 0) * sw * sd
  }

  const product = validScales.reduce((a, b) => a * b, 1)
  const geometricMean = Math.pow(product, 1 / validScales.length)
  return (lot.area ?? 0) * geometricMean * geometricMean
}
