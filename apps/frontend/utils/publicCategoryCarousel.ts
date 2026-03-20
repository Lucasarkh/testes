export const PUBLIC_CATEGORY_CAROUSEL_META_TYPE = '__lotio_category_carousel__'
export const PUBLIC_CATEGORY_CAROUSEL_SECTION_ID = 'pub-category-carousel'

export type PublicCategoryCarouselConfig = {
  title: string
  subtitle: string
  autoplay: boolean
  infinite: boolean
}

const DEFAULT_PUBLIC_CATEGORY_CAROUSEL_CONFIG: PublicCategoryCarouselConfig = {
  title: 'Explore por categoria',
  subtitle: 'Descubra grupos de lotes com perfis semelhantes e entre direto na seleção que faz sentido para você.',
  autoplay: true,
  infinite: false,
}

export const normalizePublicCategoryCarouselConfig = (
  candidate: unknown,
): PublicCategoryCarouselConfig => {
  const source = candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {}

  return {
    title: String(source.title ?? DEFAULT_PUBLIC_CATEGORY_CAROUSEL_CONFIG.title).trim() || DEFAULT_PUBLIC_CATEGORY_CAROUSEL_CONFIG.title,
    subtitle: String(source.subtitle ?? DEFAULT_PUBLIC_CATEGORY_CAROUSEL_CONFIG.subtitle).trim() || DEFAULT_PUBLIC_CATEGORY_CAROUSEL_CONFIG.subtitle,
    autoplay: source.autoplay !== false,
    infinite: source.infinite === true,
  }
}

export const stripPublicCategoryCarouselMeta = (source: unknown) => {
  const raw = Array.isArray(source) ? source : []
  let config = DEFAULT_PUBLIC_CATEGORY_CAROUSEL_CONFIG

  const highlights = raw.filter((item: any) => {
    if (item && typeof item === 'object' && item.type === PUBLIC_CATEGORY_CAROUSEL_META_TYPE) {
      config = normalizePublicCategoryCarouselConfig(item)
      return false
    }

    return true
  })

  return { highlights, config }
}

export const withPublicCategoryCarouselMeta = (
  highlights: unknown,
  config: PublicCategoryCarouselConfig,
) => {
  const pureHighlights = Array.isArray(highlights)
    ? highlights.filter((item: any) => !(item && typeof item === 'object' && item.type === PUBLIC_CATEGORY_CAROUSEL_META_TYPE))
    : []

  return [
    ...pureHighlights,
    {
      type: PUBLIC_CATEGORY_CAROUSEL_META_TYPE,
      ...normalizePublicCategoryCarouselConfig(config),
    },
  ]
}