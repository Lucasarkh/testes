function normalizeHostnameValue(value: unknown): string {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  const bracketedIpv6Match = raw.match(/^\[([^\]]+)\](?::\d+)?$/)
  if (bracketedIpv6Match) {
    return bracketedIpv6Match[1] || ''
  }

  return raw.split(':')[0] || ''
}

export function normalizeHostname(value: unknown): string {
  return normalizeHostnameValue(value)
}

export function isLoopbackHostname(value: unknown): boolean {
  const hostname = normalizeHostnameValue(value)

  return hostname === 'localhost'
    || hostname === '::1'
    || hostname === '0:0:0:0:0:0:0:1'
    || /^127\./.test(hostname)
}

export function isPrivateNetworkHostname(value: unknown): boolean {
  const hostname = normalizeHostnameValue(value)

  if (isLoopbackHostname(hostname)) return true
  if (hostname.endsWith('.local')) return true
  if (/^10\./.test(hostname)) return true
  if (/^192\.168\./.test(hostname)) return true

  const private172Match = hostname.match(/^172\.(\d{1,3})\./)
  if (private172Match) {
    const secondOctet = Number(private172Match[1])
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true
    }
  }

  return false
}

export function isKnownPlatformHostname(hostname: unknown, siteOrigin?: unknown): boolean {
  const currentHost = normalizeHostnameValue(hostname)
  if (!currentHost) return false

  if (isPrivateNetworkHostname(currentHost)) {
    return true
  }

  const configuredHost = normalizeHostnameValue(siteOrigin)
  if (!configuredHost) return false

  const bareConfiguredHost = configuredHost.replace(/^www\./, '')

  return currentHost === bareConfiguredHost || currentHost === `www.${bareConfiguredHost}`
}
