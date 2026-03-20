import type { Ref, ComputedRef } from 'vue'
import { ref, computed } from 'vue'

type SalesMotionNumericToken = 'viewsToday' | 'visits24h' | 'visitsNow'

type SalesMotionSessionState = {
  values?: Partial<Record<SalesMotionNumericToken, number>>
  recentLot?: string
  updatedAt?: number
}

const salesMotionRangeFallback: Record<SalesMotionNumericToken, { min: number; max: number }> = {
  viewsToday: { min: 3, max: 40 },
  visits24h: { min: 12, max: 260 },
  visitsNow: { min: 2, max: 22 },
}

export function useSalesMotion(
  project: Ref<any>,
  projectSlug: Ref<string>,
  previewId: Ref<string>,
  unifiedAvailableLots: Ref<any[]>,
  availableLots: ComputedRef<number>,
  totalLots: ComputedRef<number>,
) {
  const currentSalesNotice = ref('')
  const salesMotionHideTimerId = ref<number | null>(null)
  const salesMotionInitialTimerId = ref<number | null>(null)
  const salesMotionShownCount = ref(0)
  const salesMotionLastShownAt = ref(0)
  const salesMotionLastViews = ref(0)
  const salesMotionLastVisits = ref(0)
  const salesMotionReachedMilestones = ref<number[]>([])

  const salesMotionConfig = computed(() => {
    const root = project.value?.salesMotionConfig || {}
    const cfg = root?.enterprise && typeof root.enterprise === 'object' ? root.enterprise : root
    const rawTemplates = cfg?.templates
    const rawDisplayMode = String(cfg.displayMode || cfg.frequency || '').toLowerCase()
    const showOnce = cfg.showOnce === true
      || rawDisplayMode === 'single'
      || rawDisplayMode === 'once'
      || rawDisplayMode === 'one-shot'
      || rawDisplayMode === 'oneshot'

    const defaultTemplates = [
      { id: 'visitorsNow', text: '{{visitsNow}} pessoas est\u00E3o vendo este loteamento', enabled: true },
    ]

    const templates = Array.isArray(rawTemplates)
      ? rawTemplates
          .map((tpl: any, idx: number) => {
            if (typeof tpl === 'string') {
              return { id: `legacy_${idx + 1}`, text: tpl, enabled: true }
            }
            if (!tpl || typeof tpl !== 'object') return null
            return {
              id: String(tpl.id || `tpl_${idx + 1}`),
              text: String(tpl.text || ''),
              enabled: tpl.enabled !== false,
              manualRangeEnabled: tpl.manualRangeEnabled === true,
              ranges: tpl.ranges && typeof tpl.ranges === 'object' ? tpl.ranges : undefined,
            }
          })
          .filter((tpl: any) => tpl && tpl.text.trim().length > 0)
      : rawTemplates && typeof rawTemplates === 'object'
        ? Object.entries(rawTemplates)
              .map(([key, value]) => ({ id: String(key), text: String(value || ''), enabled: true, manualRangeEnabled: false, ranges: undefined }))
            .filter((tpl) => tpl.text.trim().length > 0)
        : defaultTemplates

    return {
      enabled: !!cfg.enabled,
      intervalSeconds: Math.max(5, Number(cfg.intervalSeconds ?? 14)),
      displaySeconds: 6,
      maxNotices: showOnce ? 1 : Math.max(1, Number(cfg.maxNotices ?? 5)),
      showOnce,
      templates,
    }
  })

  const salesMotionSessionStorageKey = computed(() => {
    const projectKey = String(project.value?.id || projectSlug.value || previewId.value || 'unknown')
    return `lotio:sales-motion:landing:${projectKey}`
  })

  const readSalesMotionSessionState = (): SalesMotionSessionState => {
    if (!process.client) return {}
    try {
      const raw = window.sessionStorage.getItem(salesMotionSessionStorageKey.value)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  const writeSalesMotionSessionState = (patch: Partial<SalesMotionSessionState>) => {
    if (!process.client) return
    try {
      const current = readSalesMotionSessionState()
      const merged: SalesMotionSessionState = {
        ...current,
        ...patch,
        values: {
          ...(current.values || {}),
          ...(patch.values || {}),
        },
        updatedAt: Date.now(),
      }
      window.sessionStorage.setItem(salesMotionSessionStorageKey.value, JSON.stringify(merged))
    } catch {
      // Ignore session persistence failures
    }
  }

  const resolveSalesMotionRange = (
    tpl: any,
    token: SalesMotionNumericToken,
    automatic: { min: number; max: number },
  ) => {
    if (tpl?.manualRangeEnabled !== true) {
      return {
        min: Math.max(0, Math.round(automatic.min)),
        max: Math.max(Math.max(0, Math.round(automatic.min)), Math.round(automatic.max)),
      }
    }

    const fallback = salesMotionRangeFallback[token]
    const rawMin = Number(tpl?.ranges?.[token]?.min)
    const rawMax = Number(tpl?.ranges?.[token]?.max)
    const min = Number.isFinite(rawMin) ? Math.max(0, Math.round(rawMin)) : fallback.min
    const maxCandidate = Number.isFinite(rawMax) ? Math.max(0, Math.round(rawMax)) : fallback.max
    const max = Math.max(min, maxCandidate)
    return { min, max }
  }

  const salesMotionSampleData = computed(() => {
    const lotCode = unifiedAvailableLots.value[0]?.code || project.value?.teaserLots?.[0]?.code || '24'
    const baseViews = Math.max(3, Math.min(28, Math.round((availableLots.value || 1) * 1.2)))
    const baseVisits = Math.max(12, Math.min(220, Math.round((totalLots.value || 10) * 2.8)))
    return {
      viewsToday: baseViews,
      recentLot: lotCode,
      visits24h: baseVisits,
    }
  })

  const salesMotionLotPool = computed(() => {
    const values = [
      ...(unifiedAvailableLots.value || []).map((l: any) => l?.code || l?.name),
      ...((project.value?.teaserLots || []) as any[]).map((l: any) => l?.code || l?.name),
    ]
    return Array.from(new Set(values.filter(Boolean)))
  })

  const salesMotionSectionLabelByProgress = (progress: number) => {
    if (progress >= 80) return 'contato'
    if (progress >= 60) return 'lotes'
    if (progress >= 40) return 'detalhes do projeto'
    return 'planta'
  }

  const nextSmoothInt = (
    base: number,
    lastRef: { value: number },
    min: number,
    max: number,
    varianceRatio = 0.08,
  ) => {
    const safeBase = Math.max(min, Math.min(max, Math.round(base)))
    const prev = lastRef.value || safeBase
    const step = Math.max(1, Math.round(safeBase * varianceRatio))
    const raw = prev + Math.round((Math.random() * (step * 2)) - step)
    const clamped = Math.max(min, Math.min(max, raw))
    lastRef.value = clamped
    return clamped
  }

  const clearSalesMotionTimers = () => {
    if (!process.client) return
    if (salesMotionInitialTimerId.value !== null) {
      window.clearTimeout(salesMotionInitialTimerId.value)
      salesMotionInitialTimerId.value = null
    }
    if (salesMotionHideTimerId.value !== null) {
      window.clearTimeout(salesMotionHideTimerId.value)
      salesMotionHideTimerId.value = null
    }
  }

  const buildSalesMotionNotice = (reason: 'initial' | 'scroll', progress = 0) => {
    const config = salesMotionConfig.value
    const baseData = salesMotionSampleData.value
    const lotPool = salesMotionLotPool.value
    const sessionState = readSalesMotionSessionState()
    const isLotSpecificTemplate = (tpl: any) => {
      const text = String(tpl?.text || '').toLowerCase()
      return (
        text.includes('este lote')
        || text.includes('neste lote')
        || text.includes('pagina de lote')
        || text.includes('p\u00E1gina de lote')
        || text.includes('detalhes do lote')
        || text.startsWith('lote {{recentlot}}')
      )
    }

    const activeTemplates = (config.templates || [])
      .filter((tpl: any) => tpl?.enabled !== false)

    const enterpriseOnlyTemplates = activeTemplates.filter((tpl: any) => !isLotSpecificTemplate(tpl))
    const sourceTemplates = enterpriseOnlyTemplates.length > 0 ? enterpriseOnlyTemplates : activeTemplates

    const fillTemplate = (tpl: any) => {
      const text = String(tpl?.text || '')
      const automaticViewsRange = {
        min: Math.max(1, Math.round(baseData.viewsToday * 0.7)),
        max: Math.max(2, Math.round(baseData.viewsToday * 1.3)),
      }
      const automaticVisitsRange = {
        min: Math.max(1, Math.round(baseData.visits24h * 0.75)),
        max: Math.max(2, Math.round(baseData.visits24h * 1.25)),
      }
      const automaticNowRange = {
        min: Math.max(1, Math.round(Math.max(2, baseData.viewsToday * 0.6) * 0.7)),
        max: Math.max(2, Math.round(Math.max(2, baseData.viewsToday * 0.6) * 1.25)),
      }

      const viewsRange = resolveSalesMotionRange(tpl, 'viewsToday', automaticViewsRange)
      const visitsRange = resolveSalesMotionRange(tpl, 'visits24h', automaticVisitsRange)
      const nowRange = resolveSalesMotionRange(tpl, 'visitsNow', automaticNowRange)
      const views = nextSmoothInt(baseData.viewsToday, salesMotionLastViews, viewsRange.min, viewsRange.max)
      const visits = nextSmoothInt(baseData.visits24h, salesMotionLastVisits, visitsRange.min, visitsRange.max)
      const nowUsers = nextSmoothInt(Math.max(2, Math.round(baseData.viewsToday * 0.6)), salesMotionLastViews, nowRange.min, nowRange.max, 0.12)
      const lotFromSession = String(sessionState.recentLot || '').trim()
      const hasLotFromSession = lotFromSession && lotPool.includes(lotFromSession)
      const lot = hasLotFromSession
        ? lotFromSession
        : (lotPool.length > 0 ? lotPool[0] : baseData.recentLot)

      writeSalesMotionSessionState({
        recentLot: lot,
        values: {
          viewsToday: views,
          visits24h: visits,
          visitsNow: nowUsers,
        },
      })

      return text
        .replace(/{{\s*viewsToday\s*}}/g, String(views))
        .replace(/{{\s*recentLot\s*}}/g, String(lot))
        .replace(/{{\s*visits24h\s*}}/g, String(visits))
        .replace(/{{\s*visitsNow\s*}}/g, String(nowUsers))
        .replace(/{{\s*sectionLabel\s*}}/g, String(salesMotionSectionLabelByProgress(progress)))
    }

    const options = sourceTemplates
      .map((tpl: any) => fillTemplate(tpl))
      .filter(Boolean)

    if (reason === 'scroll') {
      const contextual = sourceTemplates
        .filter((tpl: any) => {
          const text = String(tpl?.text || '')
          return text.includes('{{sectionLabel}}') || text.includes('{{visitsNow}}')
        })
        .map((tpl: any) => fillTemplate(tpl))
        .filter(Boolean)

      const source = contextual.length > 0 ? contextual : options
      return source[Math.floor(Math.random() * source.length)] || ''
    }

    return options[Math.floor(Math.random() * options.length)] || ''
  }

  const salesMotionTemplatesSignature = computed(() =>
    JSON.stringify((salesMotionConfig.value.templates || []).map((tpl: any) => ({
      id: tpl.id,
      text: tpl.text,
      enabled: tpl.enabled,
      manualRangeEnabled: tpl.manualRangeEnabled,
      ranges: tpl.ranges,
    }))),
  )

  const showNextSalesNotice = (reason: 'initial' | 'scroll', progress = 0) => {
    if (!process.client) return
    const config = salesMotionConfig.value
    const minGapMs = config.showOnce ? 0 : Math.max(2000, config.intervalSeconds * 1000)
    if (!config.enabled) return
    if (salesMotionShownCount.value >= config.maxNotices) {
      clearSalesMotionTimers()
      currentSalesNotice.value = ''
      return
    }

    const now = Date.now()
    if (currentSalesNotice.value) return
    if (!config.showOnce && now - salesMotionLastShownAt.value < minGapMs) return

    const message = buildSalesMotionNotice(reason, progress)
    if (!message) return

    currentSalesNotice.value = message
    salesMotionShownCount.value += 1
    salesMotionLastShownAt.value = now

    if (salesMotionHideTimerId.value !== null) {
      window.clearTimeout(salesMotionHideTimerId.value)
    }
    salesMotionHideTimerId.value = window.setTimeout(() => {
      currentSalesNotice.value = ''
    }, config.displaySeconds * 1000)
  }

  const startSalesMotion = () => {
    if (!process.client) return
    clearSalesMotionTimers()
    currentSalesNotice.value = ''
    salesMotionShownCount.value = 0
    salesMotionLastShownAt.value = 0
    salesMotionReachedMilestones.value = []
    const sessionState = readSalesMotionSessionState()
    const sessionViews = Number(sessionState.values?.viewsToday)
    const sessionVisits = Number(sessionState.values?.visits24h)
    salesMotionLastViews.value = Number.isFinite(sessionViews) ? sessionViews : 0
    salesMotionLastVisits.value = Number.isFinite(sessionVisits) ? sessionVisits : 0

    const config = salesMotionConfig.value
    if (!config.enabled) return

    salesMotionInitialTimerId.value = window.setTimeout(() => {
      showNextSalesNotice('initial', 0)
    }, 1800)
  }

  const handleSalesMotionNavigation = () => {
    if (!process.client) return
    if (!salesMotionConfig.value.enabled) return
    if (salesMotionConfig.value.showOnce) return
    if (salesMotionShownCount.value >= salesMotionConfig.value.maxNotices) return

    const doc = document.documentElement
    const scrollTop = window.scrollY || doc.scrollTop || 0
    const maxScrollable = Math.max(1, (doc.scrollHeight || 0) - window.innerHeight)
    const progress = Math.round((scrollTop / maxScrollable) * 100)
    const milestones = [18, 42, 68, 86]

    const nextMilestone = milestones.find((m) => progress >= m && !salesMotionReachedMilestones.value.includes(m))
    if (!nextMilestone) return

    salesMotionReachedMilestones.value = [...salesMotionReachedMilestones.value, nextMilestone]
    showNextSalesNotice('scroll', progress)
  }

  return {
    currentSalesNotice,
    salesMotionConfig,
    salesMotionTemplatesSignature,
    clearSalesMotionTimers,
    startSalesMotion,
    showNextSalesNotice,
    handleSalesMotionNavigation,
  }
}
