// https://nuxt.com/docs/api/configuration/nuxt-config
const configuredSiteUrl = process.env.NUXT_PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'https://lotio.com.br'
const siteUrl = configuredSiteUrl.replace(/\/+$/, '')
const configuredAssetBase = process.env.NUXT_PUBLIC_ASSET_BASE || process.env.ASSET_CDN_BASE_URL || 'https://img.lotio.com.br'
const assetBase = configuredAssetBase.replace(/\/+$/, '')
const ogImageUrl = `${siteUrl}/img/og-image.png`
const facebookAppId = process.env.NUXT_PUBLIC_FB_APP_ID
const defaultTitle = 'Lotio - Mais vendas para loteamentos'
const defaultDescription = 'Ofereça uma experiência digital para venda de lotes, potencialize a atuação dos corretores com links exclusivos e acompanhe tudo com métricas claras de origem, interesse e conversão.'

export default defineNuxtConfig({
  compatibilityDate: '2026-03-17',
  ssr: true,
  experimental: {
    appManifest: false
  },
  routeRules: {
    '/landing': { prerender: true },
    '/painel/**': { ssr: false },
    '/login': { ssr: false },
    '/aceitar-convite': { ssr: false },
    '/cadastro/**': { ssr: false },
    '/esqueci-senha': { ssr: false },
    '/redefinir-senha': { ssr: false },
    '/pagamento': { ssr: false },
  },
  devtools: { enabled: true },
  app: {
    head: {
      title: defaultTitle,
      meta: [
        { name: 'description', content: defaultDescription },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Lotio' },
        { property: 'og:title', content: defaultTitle },
        { property: 'og:description', content: defaultDescription },
        { property: 'og:url', content: siteUrl },
        { property: 'og:image', content: ogImageUrl },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        ...(facebookAppId ? [{ property: 'fb:app_id', content: facebookAppId }] : []),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: defaultTitle },
        { name: 'twitter:description', content: defaultDescription },
        { name: 'twitter:image', content: ogImageUrl }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/img/logo-icon.svg' },
        { rel: 'image_src', href: ogImageUrl }
      ],
      script: [
        {
          innerHTML: "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-T5MG6KF2');"
        }
      ],
      noscript: [
        {
          tagPosition: 'bodyOpen',
          innerHTML: '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-T5MG6KF2" height="0" width="0" style="display:none;visibility:hidden"></iframe>'
        }
      ]
    }
  },
  modules: ['@pinia/nuxt'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  },
  css: [
    '@/assets/css/main.css',
    'bootstrap-icons/font/bootstrap-icons.css',
    'vue3-toastify/dist/index.css',
    'primeicons/primeicons.css'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://lotio.com.br',
      siteUrl,
      assetBase
    }
  },
  vite: {
    server: {
      allowedHosts: ['all']
    }
  }
})
