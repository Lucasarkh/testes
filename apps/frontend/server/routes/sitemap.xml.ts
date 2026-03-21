import { getRequestURL, setResponseHeader } from 'h3'
import { buildAbsoluteUrl, normalizeSiteOrigin } from '~/utils/seo'

type PublicProjectSummary = {
  slug: string
  updatedAt?: string
}

type PublicLotResponse = {
  data?: Array<{
    id?: string
    code?: string
    name?: string
  }>
  total?: number
}

type SitemapEntry = {
  loc: string
  lastmod?: string
  priority?: string
  changefreq?: string
}

const LOTS_PER_PAGE = 50

function expandOriginCandidates(...origins: string[]) {
  const candidates = new Set<string>()

  for (const origin of origins) {
    const normalized = normalizeSiteOrigin(origin)
    if (!normalized) continue

    candidates.add(normalized)

    try {
      const url = new URL(normalized)
      const host = url.hostname

      if (host.startsWith('www.')) {
        url.hostname = host.slice(4)
        candidates.add(url.origin)
      } else if (host.includes('.')) {
        url.hostname = `www.${host}`
        candidates.add(url.origin)
      }
    } catch {
      // Ignore malformed fallback origins.
    }
  }

  return Array.from(candidates)
}

async function fetchJsonFromOrigins<T>(origins: string[], path: string, query?: Record<string, string | number>) {
  let lastError: unknown = null

  for (const origin of origins) {
    try {
      return {
        origin,
        data: await $fetch<T>(`${origin}${path}`, query ? { query } : undefined),
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error(`Unable to fetch ${path}`)
}

async function fetchLotPages(origins: string[], slug: string) {
  const firstPageResult = await fetchJsonFromOrigins<PublicLotResponse>(
    origins,
    `/api/p/${encodeURIComponent(slug)}/lots`,
    { page: 1, limit: LOTS_PER_PAGE },
  )
  const firstPage = firstPageResult.data

  const total = Number(firstPage?.total || 0)
  const totalPages = Math.max(1, Math.ceil(total / LOTS_PER_PAGE))
  const pages: PublicLotResponse[] = [firstPage]

  if (totalPages === 1) {
    return pages
  }

  const remainingPages = await Promise.allSettled(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchJsonFromOrigins<PublicLotResponse>(
        origins,
        `/api/p/${encodeURIComponent(slug)}/lots`,
        { page: index + 2, limit: LOTS_PER_PAGE },
      ),
    ),
  )

  for (const result of remainingPages) {
    if (result.status === 'fulfilled') {
      pages.push(result.value.data)
    }
  }

  return pages
}

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const requestUrl = getRequestURL(event)
  const siteOrigin = normalizeSiteOrigin(runtimeConfig.public.siteUrl, runtimeConfig.public.apiBase)
  const apiOrigin = normalizeSiteOrigin(runtimeConfig.public.apiBase, siteOrigin)
  const apiOrigins = expandOriginCandidates(
    apiOrigin,
    siteOrigin,
    requestUrl.origin,
  )
  const entries = new Map<string, SitemapEntry>()
  let projectsLoaded = 0
  let lotUrlsLoaded = 0
  let sourceOrigin = ''

  const addEntry = (loc: string, options: Omit<SitemapEntry, 'loc'> = {}) => {
    if (!loc) return
    entries.set(loc, { loc, ...options })
  }

  addEntry(buildAbsoluteUrl(siteOrigin, '/'), { priority: '1.0', changefreq: 'daily' })
  addEntry(buildAbsoluteUrl(siteOrigin, '/landing'), { priority: '0.5', changefreq: 'monthly' })
  addEntry(buildAbsoluteUrl(siteOrigin, '/politica-de-privacidade'), { priority: '0.2', changefreq: 'yearly' })
  addEntry(buildAbsoluteUrl(siteOrigin, '/termos-de-uso'), { priority: '0.2', changefreq: 'yearly' })

  if (apiOrigins.length > 0) {
    try {
      const projectsResult = await fetchJsonFromOrigins<PublicProjectSummary[]>(apiOrigins, '/api/p')
      const projects = projectsResult.data
      sourceOrigin = projectsResult.origin

      for (const project of projects || []) {
        const slug = String(project?.slug || '').trim()
        if (!slug) continue
        projectsLoaded += 1

        const lastmod = project.updatedAt
          ? new Date(project.updatedAt).toISOString()
          : undefined

        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}`), { lastmod, priority: '0.8', changefreq: 'weekly' })
        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/unidades`), { lastmod, priority: '0.7', changefreq: 'weekly' })
        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/categorias`), { lastmod, priority: '0.5', changefreq: 'weekly' })
        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/galeria`), { lastmod, priority: '0.6', changefreq: 'monthly' })
        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/espelho-planta`), { lastmod, priority: '0.4', changefreq: 'monthly' })

        try {
          const lotPages = await fetchLotPages(apiOrigins, slug)

          for (const page of lotPages) {
            for (const lot of page?.data || []) {
              const code = String(lot?.code || lot?.name || lot?.id || '').trim()
              if (!code) continue
              addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/${encodeURIComponent(code)}`), {
                lastmod,
                priority: '0.7',
                changefreq: 'weekly',
              })
              lotUrlsLoaded += 1
            }
          }
        } catch {
          // Keep the project-level URLs in the sitemap even if lot listing fails.
        }
      }
    } catch {
      // Keep sitemap available even if the upstream public API is temporarily unavailable.
    }
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(entries.values()).map((entry) => {
      const lines = ['  <url>', `    <loc>${xmlEscape(entry.loc)}</loc>`]
      if (entry.lastmod) lines.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`)
      if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
      if (entry.priority) lines.push(`    <priority>${entry.priority}</priority>`)
      lines.push('  </url>')
      return lines.join('\n')
    }),
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'content-type', 'application/xml; charset=UTF-8')
  setResponseHeader(event, 'x-sitemap-source-origin', sourceOrigin || 'static-only')
  setResponseHeader(event, 'x-sitemap-project-count', String(projectsLoaded))
  setResponseHeader(event, 'x-sitemap-lot-count', String(lotUrlsLoaded))
  setResponseHeader(event, 'x-sitemap-entry-count', String(entries.size))
  return body
})