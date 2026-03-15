import { setResponseHeader } from 'h3'
import { normalizeSiteOrigin } from '~/utils/seo'

export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const siteOrigin = normalizeSiteOrigin(runtimeConfig.public.siteUrl, runtimeConfig.public.apiBase)

  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /painel',
    'Disallow: /login',
    'Disallow: /aceitar-convite',
    'Disallow: /cadastro',
    'Disallow: /esqueci-senha',
    'Disallow: /redefinir-senha',
    'Disallow: /pagamento',
    'Disallow: /preview',
    ...(siteOrigin ? [`Sitemap: ${siteOrigin}/sitemap.xml`] : []),
  ]

  setResponseHeader(event, 'content-type', 'text/plain; charset=UTF-8')
  return `${lines.join('\n')}\n`
})