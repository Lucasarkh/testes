/**
 * Page Builder — types, defaults, and helpers
 * Used by ProjectLandingView (rendering) and the builder canvas (editing).
 */

// ─── Section Types ──────────────────────────────────────────────────────────

export type SectionType =
  // Widget sections (data-driven from project)
  | 'hero'
  | 'info'
  | 'plant_map'
  | 'panorama'
  | 'video'
  | 'traditional_highlights'
  | 'lots'
  | 'construction'
  | 'gallery'
  | 'location'
  | 'nearby'
  | 'scheduling'
  | 'cta'
  | 'legal_notice'
  | 'payment_conditions'
  // Free sections (user-created content)
  | 'text'
  | 'text_image'
  | 'image_block'

export type TextAlign = 'left' | 'center' | 'right'
export type SectionPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl'
export type ImagePosition = 'left' | 'right'

/* Padding value map (px) used by section renderers */
export const PADDING_MAP: Record<SectionPadding, string> = {
  none: '0',
  sm: '40px',
  md: '64px',
  lg: '100px',
  xl: '140px',
}

// ─── Base Config ────────────────────────────────────────────────────────────

export interface SectionBaseConfig {
  /** Hex background color override, e.g. "#f5f5f7" */
  bgColor?: string
  /** CSS gradient override, e.g. "linear-gradient(135deg,#0071e3,#00c3ff)" */
  bgGradient?: string
  /** Hex text color override */
  textColor?: string
  /** Top padding */
  paddingTop?: SectionPadding
  /** Bottom padding */
  paddingBottom?: SectionPadding
  /** Container max-width variant */
  containerWidth?: 'narrow' | 'normal' | 'wide' | 'full'
}

// ─── Widget Section Configs ──────────────────────────────────────────────────

export interface HeroConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
  overlayOpacity?: number
  overlayColor?: string
  showStats?: boolean
  btnPrimaryText?: string
  btnPrimaryLink?: string
  btnSecondaryText?: string
  btnSecondaryLink?: string
  btnTertiaryText?: string
  btnTertiaryLink?: string
}

export interface InfoConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
  showInfrastructure?: boolean
}

export interface PlantMapConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
  mapHeight?: number
}

export interface PanoramaConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
}

export interface VideoConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
}

export interface TraditionalHighlightsConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
}

export interface LotsConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
}

export interface ConstructionConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
}

export interface GalleryConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
  columns?: 2 | 3 | 4
}

export interface LocationConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
}

export interface NearbyConfig extends SectionBaseConfig {
  title?: string
  titleAlign?: TextAlign
}

export interface SchedulingConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  titleAlign?: TextAlign
}

export interface CtaConfig extends SectionBaseConfig {
  title?: string
  subtitle?: string
  badge?: string
  titleAlign?: TextAlign
}

export interface LegalNoticeConfig extends SectionBaseConfig {}

export interface PaymentConditionsConfig extends SectionBaseConfig {
  title?: string
  titleAlign?: TextAlign
}

// ─── Free Section Configs ────────────────────────────────────────────────────

export interface TextSectionConfig extends SectionBaseConfig {
  title?: string
  titleAlign?: TextAlign
  titleSize?: 'sm' | 'md' | 'lg' | 'xl'
  content?: string
  contentAlign?: TextAlign
}

export interface TextImageSectionConfig extends SectionBaseConfig {
  title?: string
  titleAlign?: TextAlign
  content?: string
  imageUrl?: string
  imageAlt?: string
  imagePosition?: ImagePosition
  imageRounded?: boolean
  imageShadow?: boolean
}

export interface ImageBlockSectionConfig extends SectionBaseConfig {
  imageUrl?: string
  imageAlt?: string
  caption?: string
  captionAlign?: TextAlign
  width?: 'narrow' | 'normal' | 'wide' | 'full'
  rounded?: boolean
  shadow?: boolean
  linkUrl?: string
  linkTarget?: '_blank' | '_self'
}

// Union of all configs
export type SectionConfig =
  | HeroConfig
  | InfoConfig
  | PlantMapConfig
  | PanoramaConfig
  | VideoConfig
  | TraditionalHighlightsConfig
  | LotsConfig
  | ConstructionConfig
  | GalleryConfig
  | LocationConfig
  | NearbyConfig
  | SchedulingConfig
  | CtaConfig
  | LegalNoticeConfig
  | PaymentConditionsConfig
  | TextSectionConfig
  | TextImageSectionConfig
  | ImageBlockSectionConfig

// ─── Core Section Interface ──────────────────────────────────────────────────

export interface PageSection {
  /** Stable unique ID (cuid or uuid assigned at creation) */
  id: string
  type: SectionType
  /** Render order (ascending) */
  order: number
  /** Is section visible on the public page */
  visible: boolean
  /** Section-specific configuration — loosely typed for runtime flexibility */
  config: Record<string, any>
}

// ─── Builder Metadata ────────────────────────────────────────────────────────

export interface SectionMeta {
  type: SectionType
  label: string
  icon: string
  /** Free sections can be added multiple times; widgets are singletons */
  allowMultiple: boolean
  /** Widget sections are conditionally available (need data in the project) */
  widget: boolean
  description: string
}

export const SECTION_META: SectionMeta[] = [
  // ── Core widgets
  { type: 'hero',                   label: 'Hero / Topo',            icon: 'bi-image',                  allowMultiple: false, widget: true,  description: 'Banner principal com título, estatísticas e CTAs' },
  { type: 'info',                   label: 'Infraestrutura',         icon: 'bi-list-check',             allowMultiple: false, widget: true,  description: 'Diferenciais e infraestrutura do empreendimento' },
  { type: 'plant_map',              label: 'Planta Interativa',      icon: 'bi-map',                    allowMultiple: false, widget: true,  description: 'Mapa interativo com hotspots de lotes' },
  { type: 'panorama',               label: 'Vista 360°',             icon: 'bi-arrows-fullscreen',      allowMultiple: false, widget: true,  description: 'Tour virtual panorâmico 360°' },
  { type: 'video',                  label: 'Vídeo',                  icon: 'bi-play-btn',               allowMultiple: false, widget: true,  description: 'Vídeo de apresentação do YouTube' },
  { type: 'traditional_highlights', label: 'Destaques',              icon: 'bi-stars',                  allowMultiple: false, widget: true,  description: 'Grid de diferenciais e ícones' },
  { type: 'lots',                   label: 'Lotes Disponíveis',      icon: 'bi-grid',                   allowMultiple: false, widget: true,  description: 'Preview de lotes com preços' },
  { type: 'construction',           label: 'Acompanhamento de Obras',  icon: 'bi-building-gear',          allowMultiple: false, widget: true,  description: 'Barras de progresso das obras' },
  { type: 'gallery',                label: 'Galeria de Fotos',       icon: 'bi-images',                 allowMultiple: false, widget: true,  description: 'Grade de fotos e mídias' },
  { type: 'location',               label: 'Localização',            icon: 'bi-geo-alt',                allowMultiple: false, widget: true,  description: 'Mapa Google Maps e endereço' },
  { type: 'nearby',                 label: 'Proximidades',           icon: 'bi-pin-map',                allowMultiple: false, widget: true,  description: 'Pontos de interesse próximos' },
  { type: 'scheduling',             label: 'Agendamento',            icon: 'bi-calendar-event',         allowMultiple: false, widget: true,  description: 'Formulário de agendamento de visita' },
  { type: 'payment_conditions',     label: 'Condições de Pagamento', icon: 'bi-calculator',             allowMultiple: false, widget: true,  description: 'Simulador financeiro integrado' },
  { type: 'cta',                    label: 'Formulário de Contato',  icon: 'bi-chat-dots',              allowMultiple: false, widget: true,  description: 'Formulário principal de captação de lead' },
  { type: 'legal_notice',           label: 'Aviso Legal',            icon: 'bi-shield-check',           allowMultiple: false, widget: true,  description: 'Texto de registro e aviso legal' },
  // ── Free sections
  { type: 'text',                   label: 'Bloco de Texto',         icon: 'bi-file-text',              allowMultiple: true,  widget: false, description: 'Texto livre com formatação rica' },
  { type: 'text_image',             label: 'Texto + Imagem',         icon: 'bi-layout-text-sidebar',   allowMultiple: true,  widget: false, description: 'Texto ao lado de uma imagem' },
  { type: 'image_block',            label: 'Bloco de Imagem',        icon: 'bi-card-image',             allowMultiple: true,  widget: false, description: 'Imagem standalone com legenda opcional' },
]

// ─── Default configs per type ────────────────────────────────────────────────

export const DEFAULT_CONFIGS: Record<SectionType, SectionConfig> = {
  hero:                   { paddingTop: 'none', paddingBottom: 'none', titleAlign: 'left', showStats: true } as HeroConfig,
  info:                   { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'left' } as InfoConfig,
  plant_map:              { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center', mapHeight: 540 } as PlantMapConfig,
  panorama:               { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center' } as PanoramaConfig,
  video:                  { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center', bgColor: '#f5f5f7' } as VideoConfig,
  traditional_highlights: { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center' } as TraditionalHighlightsConfig,
  lots:                   { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'left', bgColor: '#f5f5f7' } as LotsConfig,
  construction:           { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center' } as ConstructionConfig,
  gallery:                { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'left', bgColor: '#f5f5f7', columns: 3 } as GalleryConfig,
  location:               { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center' } as LocationConfig,
  nearby:                 { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center' } as NearbyConfig,
  scheduling:             { paddingTop: 'lg', paddingBottom: 'lg', bgColor: '#1d1d1f', textColor: '#ffffff' } as SchedulingConfig,
  cta:                    { paddingTop: 'lg', paddingBottom: 'lg', bgColor: '#fbfbfd', titleAlign: 'center' } as CtaConfig,
  legal_notice:           {} as LegalNoticeConfig,
  payment_conditions:     { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center' } as PaymentConditionsConfig,
  text:                   { paddingTop: 'lg', paddingBottom: 'lg', titleAlign: 'center', contentAlign: 'center', content: '' } as TextSectionConfig,
  text_image:             { paddingTop: 'lg', paddingBottom: 'lg', imagePosition: 'right', imageRounded: true, imageShadow: true, content: '' } as TextImageSectionConfig,
  image_block:            { paddingTop: 'md', paddingBottom: 'md', width: 'normal', rounded: true, shadow: true } as ImageBlockSectionConfig,
}

// ─── ID Generation ───────────────────────────────────────────────────────────

let _idCounter = 0
export function generateSectionId(type: SectionType): string {
  return `${type}_${Date.now()}_${_idCounter++}`
}

// ─── Default layout generator ────────────────────────────────────────────────

/**
 * Generates the default sections layout based on what the project has.
 * Called when a project has no sectionsLayout saved yet.
 */
export function getDefaultSectionsLayout(project: any): PageSection[] {
  const sections: PageSection[] = [
    { id: 'hero',                   type: 'hero',                   order: 0,  visible: true, config: { ...DEFAULT_CONFIGS.hero } },
    { id: 'info',                   type: 'info',                   order: 1,  visible: !!(project?.highlightsJson || project?.locationText), config: { ...DEFAULT_CONFIGS.info } },
    { id: 'plant_map',              type: 'plant_map',              order: 2,  visible: !!project?.plantMap, config: { ...DEFAULT_CONFIGS.plant_map } },
    { id: 'panorama',               type: 'panorama',               order: 3,  visible: true,  config: { ...DEFAULT_CONFIGS.panorama } },
    { id: 'video',                  type: 'video',                  order: 4,  visible: !!project?.youtubeVideoUrl, config: { ...DEFAULT_CONFIGS.video } },
    { id: 'traditional_highlights', type: 'traditional_highlights', order: 5,  visible: !!(project?.highlightsJson), config: { ...DEFAULT_CONFIGS.traditional_highlights } },
    { id: 'lots',                   type: 'lots',                   order: 6,  visible: (project?.lotSummary?.available ?? 0) > 0, config: { ...DEFAULT_CONFIGS.lots } },
    { id: 'construction',           type: 'construction',           order: 7,  visible: !!(project?.constructionStatus?.length), config: { ...DEFAULT_CONFIGS.construction } },
    { id: 'gallery',                type: 'gallery',                order: 8,  visible: !!(project?.projectMedias?.length), config: { ...DEFAULT_CONFIGS.gallery } },
    { id: 'location',               type: 'location',               order: 9,  visible: !!(project?.googleMapsUrl || project?.address), config: { ...DEFAULT_CONFIGS.location } },
    { id: 'nearby',                 type: 'nearby',                 order: 10, visible: project?.nearbyEnabled !== false, config: { ...DEFAULT_CONFIGS.nearby } },
    { id: 'scheduling',             type: 'scheduling',             order: 11, visible: true,  config: { ...DEFAULT_CONFIGS.scheduling } },
    { id: 'payment_conditions',     type: 'payment_conditions',     order: 12, visible: !!project?.showPaymentConditions, config: { ...DEFAULT_CONFIGS.payment_conditions } },
    { id: 'cta',                    type: 'cta',                    order: 13, visible: true, config: { ...DEFAULT_CONFIGS.cta } },
    { id: 'legal_notice',           type: 'legal_notice',           order: 14, visible: !!project?.legalNotice, config: { ...DEFAULT_CONFIGS.legal_notice } },
  ]
  return sections
}

/**
 * Returns an up-to-date sections layout, either from saved data or generated default.
 * Merges any missing widget sections from the default into existing saved layouts
 * so new widget types are always available.
 */
export function resolveSectionsLayout(project: any): PageSection[] {
  const saved: PageSection[] | null = project?.sectionsLayout
    ? (Array.isArray(project.sectionsLayout) ? project.sectionsLayout : null)
    : null

  if (!saved || saved.length === 0) {
    return getDefaultSectionsLayout(project)
  }

  // Merge missing widget sections that might have been added to the platform later
  const existingTypes = new Set(saved.map(s => s.type))
  const defaults = getDefaultSectionsLayout(project)
  const missing = defaults.filter(d => {
    const meta = SECTION_META.find(m => m.type === d.type)
    return meta?.widget !== false && !existingTypes.has(d.type)
  })

  if (missing.length === 0) return saved

  const maxOrder = Math.max(...saved.map(s => s.order), 0)
  const merged = [...saved, ...missing.map((s, i) => ({ ...s, order: maxOrder + i + 1 }))]
  return merged.sort((a, b) => a.order - b.order)
}

/**
 * Re-assigns `order` values sequentially (0, 1, 2...) after a drag reorder.
 */
export function reorderSections(sections: PageSection[]): PageSection[] {
  return sections.map((s, i) => ({ ...s, order: i }))
}

/**
 * Applies padding values to a style object for a section.
 */
export function getSectionStyle(config: SectionBaseConfig): Record<string, string> {
  const style: Record<string, string> = {}

  if (config.bgGradient) {
    style.background = config.bgGradient
  } else if (config.bgColor) {
    style.background = config.bgColor
  }

  if (config.textColor) {
    style.color = config.textColor
  }

  if (config.paddingTop) {
    style.paddingTop = PADDING_MAP[config.paddingTop]
  }

  if (config.paddingBottom) {
    style.paddingBottom = PADDING_MAP[config.paddingBottom]
  }

  return style
}

/**
 * Metadata for the builder canvas by category.
 */
export const WIDGET_SECTIONS = SECTION_META.filter(s => s.widget)
export const FREE_SECTIONS   = SECTION_META.filter(s => !s.widget)
