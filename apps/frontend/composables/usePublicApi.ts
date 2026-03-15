/**
 * Public API composable — no auth headers, for /p/ routes.
 */
export const usePublicApi = () => {
  const config = useRuntimeConfig()
  let apiBase = (config.public.apiBase || '').replace(/\/+$/, '')

  // In the browser: if the configured apiBase points to a different host than
  // the current page (e.g. apiBase='https://lotio.com.br' but we are on
  // 'vendas.saobento.com.br'), fall back to relative URLs so the request goes
  // to the current host. Caddy will proxy it with the correct Host header,
  // allowing TenantMiddleware to resolve the custom domain properly.
  if (process.client && apiBase) {
    try {
      const configuredHost = new URL(
        apiBase.startsWith('http') ? apiBase : `https://${apiBase}`,
      ).hostname

      const currentHost = window.location.hostname
      const isLocalDev = currentHost === 'localhost' || currentHost === '127.0.0.1'

      // In local development, keep absolute apiBase to allow testing against
      // production/staging APIs from localhost.
      if (!isLocalDev && configuredHost !== currentHost) {
        apiBase = ''
      }
    } catch {
      // Malformed apiBase — let it fall through as-is
    }
  }

  const baseUrl = `${apiBase}/api`

  const fetchPublic = async (url: string, options: any = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers }
    const res = await fetch(`${baseUrl}${url}`, { 
      ...options, 
      headers,
      credentials: 'include' // Important for session cookies
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erro na requisição' }))
      const error = new Error(err.message || `Erro ${res.status}`) as Error & { status?: number; data?: any }
      error.status = res.status
      error.data = err
      throw error
    }
    const txt = await res.text()
    return txt ? JSON.parse(txt) : null
  }

  return { 
    fetchPublic,
    get: (url: string, options: any = {}) => fetchPublic(url, { ...options, method: 'GET' }),
    post: (url: string, body?: any, options: any = {}) => fetchPublic(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  }
}
