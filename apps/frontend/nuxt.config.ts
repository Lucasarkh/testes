// https://nuxt.com/docs/api/configuration/nuxt-config
const configuredSiteUrl = process.env.NUXT_PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'https://www.lotio.com.br'
const siteUrl = configuredSiteUrl.replace(/\/+$/, '')
const ogImageUrl = `${siteUrl}/img/og-image.png`
const facebookAppId = process.env.NUXT_PUBLIC_FB_APP_ID
const defaultTitle = 'Lotio - Estande digital para Loteamentos'
const defaultDescription = 'Plataforma de experiência visual completa para loteamentos, com recursos interativos e imersivos.'

export default defineNuxtConfig({
  ssr: false, 
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
    '@/assets/css/landing.css',
    'bootstrap-icons/font/bootstrap-icons.css',
    'vue3-toastify/dist/index.css',
    'primeicons/primeicons.css'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://lotio.com.br',
      siteUrl
    }
  },
  vite: {
    server: {
      allowedHosts: ['all']
    }
  }
})
