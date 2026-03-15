import { setResponseHeader } from 'h3'
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
  const siteOrigin = normalizeSiteOrigin(runtimeConfig.public.siteUrl, runtimeConfig.public.apiBase)
  const apiOrigin = normalizeSiteOrigin(runtimeConfig.public.apiBase, siteOrigin)
  const entries = new Map<string, SitemapEntry>()

  const addEntry = (loc: string, options: Omit<SitemapEntry, 'loc'> = {}) => {
    if (!loc) return
    entries.set(loc, { loc, ...options })
  }

  addEntry(buildAbsoluteUrl(siteOrigin, '/'), { priority: '1.0' })
  addEntry(buildAbsoluteUrl(siteOrigin, '/landing'), { priority: '0.9' })
  addEntry(buildAbsoluteUrl(siteOrigin, '/politica-de-privacidade'), { priority: '0.3' })
  addEntry(buildAbsoluteUrl(siteOrigin, '/termos-de-uso'), { priority: '0.3' })

  if (apiOrigin) {
    try {
      const projects = await $fetch<PublicProjectSummary[]>(`${apiOrigin}/api/p`)

      for (const project of projects || []) {
        const slug = String(project?.slug || '').trim()
        if (!slug) continue

        const lastmod = project.updatedAt
          ? new Date(project.updatedAt).toISOString()
          : undefined

        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}`), { lastmod, priority: '0.8' })
        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/unidades`), { lastmod, priority: '0.7' })
        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/galeria`), { lastmod, priority: '0.6' })
        addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/espelho-planta`), { lastmod, priority: '0.4' })

        const firstPage = await $fetch<PublicLotResponse>(
          `${apiOrigin}/api/p/${encodeURIComponent(slug)}/lots`,
          { query: { page: 1, limit: 50 } },
        )

        const total = Number(firstPage?.total || 0)
        const totalPages = Math.max(1, Math.ceil(total / 50))
        const lotPages: PublicLotResponse[] = [firstPage]

        if (totalPages > 1) {
          const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              $fetch<PublicLotResponse>(
                `${apiOrigin}/api/p/${encodeURIComponent(slug)}/lots`,
                { query: { page: index + 2, limit: 50 } },
              ),
            ),
          )
          lotPages.push(...remainingPages)
        }

        for (const page of lotPages) {
          for (const lot of page?.data || []) {
            const code = String(lot?.code || lot?.name || lot?.id || '').trim()
            if (!code) continue
            addEntry(buildAbsoluteUrl(siteOrigin, `/${slug}/${encodeURIComponent(code)}`), {
              lastmod,
              priority: '0.7',
            })
          }
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
      if (entry.priority) lines.push(`    <priority>${entry.priority}</priority>`)
      lines.push('  </url>')
      return lines.join('\n')
    }),
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'content-type', 'application/xml; charset=UTF-8')
  return body
})