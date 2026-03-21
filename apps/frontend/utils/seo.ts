function normalizeLotioCanonicalHostname(url: URL): URL {
  if (url.hostname === 'www.lotio.com.br') {
    url.hostname = 'lotio.com.br'
  }

  return url
}

export function normalizeSiteOrigin(input: unknown, fallback = ''): string {
  const raw = String(input || '').trim() || String(fallback || '').trim()
  if (!raw) return ''

  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return normalizeLotioCanonicalHostname(new URL(normalized)).origin.replace(/\/+$/, '')
  } catch {
    return String(fallback || '').trim().replace(/\/+$/, '')
  }
}

export function buildAbsoluteUrl(origin: string, path = '/'): string {
  const safeOrigin = String(origin || '').trim().replace(/\/+$/, '')
  const safePath = String(path || '/').trim() || '/'

  if (!safeOrigin) {
    return safePath.startsWith('/') ? safePath : `/${safePath}`
  }

  try {
    const url = new URL(safePath, `${safeOrigin}/`)
    // Strip trailing slash from all paths except the root "/"
    const result = url.toString()
    return url.pathname !== '/' ? result.replace(/\/+$/, '') : result
  } catch {
    return `${safeOrigin}${safePath.startsWith('/') ? safePath : `/${safePath}`}`
  }
}

/**
 * Build a canonical URL using the canonical site origin (not the request origin).
 * This ensures canonical URLs are always consistent regardless of the hostname
 * used to access the page (www, custom domain, etc.).
 */
export function buildCanonicalUrl(siteOrigin: string, path: string): string {
  const normalizedOrigin = normalizeSiteOrigin(siteOrigin)
  // Strip query params and hash — canonical should be the clean path
  const cleanPath = String(path || '/').split('?')[0].split('#')[0]
  return buildAbsoluteUrl(normalizedOrigin || 'https://lotio.com.br', cleanPath)
}

export function resolveSeoImage(origin: string, ...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const value = String(candidate || '').trim()
    if (!value) continue

    if (/^https?:\/\//i.test(value)) return value
    if (value.startsWith('//')) return `https:${value}`

    return buildAbsoluteUrl(origin, value.startsWith('/') ? value : `/${value}`)
  }

  return buildAbsoluteUrl(origin, '/img/og-image.png')
}

export function buildRobotsContent(noindex = false): string {
  return noindex
    ? 'noindex, nofollow, noarchive, nosnippet'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
}