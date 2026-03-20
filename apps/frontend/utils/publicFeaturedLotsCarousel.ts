export const PUBLIC_FEATURED_LOTS_CAROUSEL_META_TYPE = '__lotio_featured_lots_carousel__'
export const PUBLIC_FEATURED_LOTS_CAROUSEL_SECTION_ID = 'pub-featured-lots-carousel'

export type PublicFeaturedLotsCarouselConfig = {
  autoplay: boolean
  infinite: boolean
  lotCodes: string[]
}

const DEFAULT_PUBLIC_FEATURED_LOTS_CAROUSEL_CONFIG: PublicFeaturedLotsCarouselConfig = {
  autoplay: false,
  infinite: false,
  lotCodes: [],
}

const normalizeFeaturedLotCode = (value: unknown) => String(value ?? '').trim()

export const normalizePublicFeaturedLotsCarouselConfig = (
  candidate: unknown,
): PublicFeaturedLotsCarouselConfig => {
  const source = candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {}
  const rawCodes = Array.isArray(source.lotCodes)
    ? source.lotCodes
    : Array.isArray(source.codes)
      ? source.codes
      : []

  const seen = new Set<string>()
  const lotCodes = rawCodes
    .map(normalizeFeaturedLotCode)
    .filter((code) => code.length > 0)
    .filter((code) => !seen.has(code) && seen.add(code))

  return {
    autoplay: source.autoplay === true,
    infinite: source.infinite === true,
    lotCodes,
  }
}

export const stripPublicFeaturedLotsCarouselMeta = (source: unknown) => {
  const raw = Array.isArray(source) ? source : []
  let config = DEFAULT_PUBLIC_FEATURED_LOTS_CAROUSEL_CONFIG

  const highlights = raw.filter((item: any) => {
    if (item && typeof item === 'object' && item.type === PUBLIC_FEATURED_LOTS_CAROUSEL_META_TYPE) {
      config = normalizePublicFeaturedLotsCarouselConfig(item)
      return false
    }

    return true
  })

  return { highlights, config }
}

export const withPublicFeaturedLotsCarouselMeta = (
  highlights: unknown,
  config: PublicFeaturedLotsCarouselConfig,
) => {
  const pureHighlights = Array.isArray(highlights)
    ? highlights.filter((item: any) => !(item && typeof item === 'object' && item.type === PUBLIC_FEATURED_LOTS_CAROUSEL_META_TYPE))
    : []

  return [
    ...pureHighlights,
    {
      type: PUBLIC_FEATURED_LOTS_CAROUSEL_META_TYPE,
      ...normalizePublicFeaturedLotsCarouselConfig(config),
    },
  ]
}