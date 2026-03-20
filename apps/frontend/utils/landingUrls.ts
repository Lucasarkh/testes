/**
 * Pure helpers extracted from ProjectLandingView computed properties.
 * No Vue reactivity – each function takes the raw value and returns the result.
 */

/** Build the public page URL for a given lot */
export function buildLotPageUrl(lot: any, pathPrefix: string, corretorCode: string): string {
  const code = lot.code || lot.name || lot.id
  const base = pathPrefix === ''
    ? `/${encodeURIComponent(code)}`
    : `${pathPrefix}/${encodeURIComponent(code)}`

  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
}

/** Convert any YouTube URL to embeddable format */
export function toYoutubeEmbedUrl(raw: string): string {
  if (!raw) return ''
  // Already an embed URL
  if (raw.includes('/embed/')) return raw
  // Extract video ID from various YouTube URL formats
  let videoId = ''
  try {
    const url = new URL(raw)
    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.slice(1)
    } else if (url.searchParams.has('v')) {
      videoId = url.searchParams.get('v') || ''
    } else if (url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.replace('/embed/', '')
    }
  } catch {
    // Try regex as last resort
    const m = raw.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/)
    if (m) videoId = m[1]
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : raw
}

/** Normalise any Google Maps URL / pasted iframe to an embeddable src */
export function toGoogleMapsEmbedUrl(raw: string): string {
  if (!raw) return ''

  // If user pasted an <iframe> tag, extract the src
  const iframeSrcMatch = raw.match(/src=["']([^"']+)["']/)
  const url = iframeSrcMatch ? iframeSrcMatch[1] : raw.trim()

  // Already a proper embed URL
  if (url.includes('/maps/embed')) return url

  // Ensure absolute URL
  const abs = url.startsWith('http') ? url : `https://${url}`

  // Convert Google Maps links to embed format
  try {
    const parsed = new URL(abs)
    const host = parsed.hostname.replace('www.', '')
    if (host.includes('google') && host.includes('map')) {
      // /maps/place/NAME/@lat,lng → use place query embed
      const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/@]+)/)
      if (placeMatch) {
        return `https://www.google.com/maps/embed/v1/place?key=&q=${encodeURIComponent(placeMatch[1] || '')}`
          .replace('key=&', '') // works without key for simple embeds when using /maps/embed?pb method
      }
      // If it has a 'pb' or 'data' param, convert to embed URL
      if (parsed.searchParams.has('pb') || parsed.pathname.includes('data=')) {
        return abs.replace('/maps/', '/maps/embed/')
          .replace('/maps/embed/place/', '/maps/embed/v1/place/')
      }
      // Generic: use the q param or the full URL as embed query
      const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || ''
      if (q) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
      }
    }
  } catch {
    // ignore parse errors
  }

  // Fallback: try adding output=embed for general maps URLs
  if (abs.includes('google') && abs.includes('map')) {
    const sep = abs.includes('?') ? '&' : '?'
    return `${abs}${sep}output=embed`
  }

  return abs
}
