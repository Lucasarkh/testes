import { createError, defineEventHandler, getQuery, getRequestURL, setResponseHeader } from 'h3'

const collectAllowedHosts = (event: Parameters<typeof defineEventHandler>[0] extends never ? never : any) => {
  const runtimeConfig = useRuntimeConfig(event)
  const requestUrl = getRequestURL(event)
  const candidates = [
    requestUrl.origin,
    runtimeConfig.public.siteUrl,
    runtimeConfig.public.apiBase,
  ]

  const hosts = new Set<string>()

  for (const candidate of candidates) {
    try {
      const parsed = new URL(String(candidate || '').trim())
      hosts.add(parsed.hostname.toLowerCase())
    } catch {
      // Ignore malformed runtime config values.
    }
  }

  return hosts
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawUrl = Array.isArray(query.url) ? query.url[0] : query.url

  if (!rawUrl || typeof rawUrl !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing panorama URL' })
  }

  const requestUrl = getRequestURL(event)
  const target = new URL(rawUrl, requestUrl.origin)

  if (!['http:', 'https:'].includes(target.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid panorama protocol' })
  }

  const allowedHosts = collectAllowedHosts(event)
  const targetHost = target.hostname.toLowerCase()

  if (!allowedHosts.has(targetHost) && !targetHost.endsWith('.amazonaws.com')) {
    throw createError({ statusCode: 403, statusMessage: 'Panorama host not allowed' })
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  })

  if (!upstream.ok) {
    throw createError({
      statusCode: upstream.status,
      statusMessage: 'Failed to load panorama image',
    })
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=300, s-maxage=300'
  const etag = upstream.headers.get('etag')
  const lastModified = upstream.headers.get('last-modified')

  setResponseHeader(event, 'content-type', contentType)
  setResponseHeader(event, 'cache-control', cacheControl)
  setResponseHeader(event, 'x-robots-tag', 'noindex')

  if (etag) {
    setResponseHeader(event, 'etag', etag)
  }

  if (lastModified) {
    setResponseHeader(event, 'last-modified', lastModified)
  }

  const body = await upstream.arrayBuffer()
  return Buffer.from(body)
})