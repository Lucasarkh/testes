import { setResponseHeader } from 'h3'
import { normalizeSiteOrigin } from '~/utils/seo'

export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const siteOrigin = normalizeSiteOrigin(runtimeConfig.public.siteUrl, runtimeConfig.public.apiBase)

  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Auth and dashboard (SPA-only, no SSR)',
    'Disallow: /painel/',
    'Disallow: /painel',
    'Disallow: /login',
    'Disallow: /aceitar-convite',
    'Disallow: /cadastro/',
    'Disallow: /cadastro',
    'Disallow: /esqueci-senha',
    'Disallow: /redefinir-senha',
    'Disallow: /pagamento',
    '',
    '# Preview and internal',
    'Disallow: /preview/',
    'Disallow: /preview',
    'Disallow: /api/',
    '',
    '# Purchase flow',
    'Disallow: /fluxo-compra/',
    'Disallow: /fluxo-compra',
    'Disallow: /sou-cliente',
    'Disallow: /obrigado',
    '',
    ...(siteOrigin ? [`Sitemap: ${siteOrigin}/sitemap.xml`] : []),
  ]

  setResponseHeader(event, 'content-type', 'text/plain; charset=UTF-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400')
  return `${lines.join('\n')}\n`
})
