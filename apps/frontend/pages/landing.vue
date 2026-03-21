<template>
  <div ref="pageRef" class="lp-root">
    <LandingHeader />

    <section class="lp-hero">
      <div class="lp-hero-bg"></div>
      <div class="lp-container lp-hero-inner">
        <div class="lp-hero-copy" data-reveal-group>
          <h1 class="lp-hero-title" data-reveal>
            Venda seu loteamento com <span class="lp-hl">estoque em tempo real</span>,
            leads com contexto e reserva online.
          </h1>
          <p class="lp-hero-subtitle" data-reveal>
            Pare de perder venda em PDF, planilha e atendimento sem contexto. O Lotio transforma seu mapa
            em uma operação comercial viva, rastreável e pronta para escalar com tráfego, corretores e
            imobiliárias parceiras.
          </p>

          <div class="lp-hero-actions" data-reveal>
            <button class="lp-btn-primary" @click="scrollToForm">
              Quero ver meu empreendimento assim
            </button>
            <button v-if="settings?.contactWhatsapp" class="lp-btn-secondary" @click="openWhatsapp">
              Falar no WhatsApp
            </button>
          </div>

          <ul class="lp-proof-list" data-reveal>
            <li v-for="item in proofItems" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div class="lp-hero-side" data-reveal-group>
          <div class="lp-hero-visual" data-reveal>
            <img
              src="/img/landing/loteamento_desk_topo.png"
              alt="Visao principal do empreendimento na Lotio"
              class="lp-hero-image"
            />
            <div class="lp-hero-tags">
              <span>Mapa interativo</span>
              <span>Lead identificado</span>
              <span>Reserva online</span>
            </div>
          </div>

          <div id="form-top" class="lp-form-card" :class="{ 'is-scrolled': isScrolled }" data-reveal>
            <div v-if="submitted" class="lp-form-success">
              <div class="lp-success-icon">✓</div>
              <h3>Solicitação enviada</h3>
              <p>
                Nossa equipe comercial entra em contato em até 1 dia útil para entender seu cenário e mostrar
                a plataforma na prática.
              </p>
              <button v-if="settings?.contactWhatsapp" class="lp-btn-whatsapp" @click="openWhatsapp">
                Falar agora no WhatsApp
              </button>
            </div>

            <form v-else class="lp-form" @submit.prevent="submitForm">
              <div class="lp-form-header">
                <h2 class="lp-form-title">Solicitar demonstração comercial</h2>
                <p class="lp-form-subtitle">Preencha em menos de 30 segundos. Sem compromisso.</p>
              </div>

              <div class="lp-field">
                <label>Nome completo</label>
                <input v-model="form.name" type="text" placeholder="Seu nome" required />
              </div>

              <div class="lp-field-row">
                <div class="lp-field">
                  <label>E-mail</label>
                  <input v-model="form.email" type="email" placeholder="seu@email.com" required />
                </div>
                <div class="lp-field">
                  <label>WhatsApp</label>
                  <input
                    :value="form.phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    required
                    @input="form.phone = applyPhoneMask($event.target.value)"
                  />
                </div>
              </div>

              <div class="lp-field-row">
                <div class="lp-field">
                  <label>Empresa / Empreendimento</label>
                  <input v-model="form.company" type="text" placeholder="Nome da empresa ou projeto" />
                </div>
                <div class="lp-field">
                  <label>Seu perfil</label>
                  <select v-model="form.role">
                    <option value="">Selecione</option>
                    <option>Diretor / Proprietário</option>
                    <option>Gerente Comercial</option>
                    <option>Corretor de Imóveis</option>
                    <option>Gerente de Marketing</option>
                    <option>Responsável de TI</option>
                    <option>Outro</option>
                  </select>
                </div>
              </div>

              <div class="lp-field">
                <label>O que você precisa resolver? (opcional)</label>
                <textarea
                  v-model="form.message"
                  rows="3"
                  placeholder="Ex.: Hoje operamos com PDF e leads sem contexto. Quero entender como organizar isso melhor."
                ></textarea>
              </div>

              <button type="submit" class="lp-btn-primary lp-btn-primary--full" :disabled="submitting">
                {{ submitting ? 'Enviando...' : 'Quero ver na prática' }}
              </button>
              <p class="lp-form-footnote">Seus dados estão seguros. Sem spam.</p>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="lp-trust" data-reveal-group>
      <div class="lp-container lp-trust-inner">
        <span class="lp-trust-label" data-reveal>Feito para operações com:</span>
        <div class="lp-trust-list">
          <span v-for="item in trustItems" :key="item" class="lp-trust-item" data-reveal>{{ item }}</span>
        </div>
      </div>
    </section>

    <section class="lp-section lp-section--pain">
      <div class="lp-container" data-reveal-group>
        <div class="lp-section-head">
          <div class="lp-badge-dark" data-reveal>O que trava sua conversão</div>
          <h2 class="lp-section-title" data-reveal>
            Se o cliente depende de PDF, planilha e repasse manual,
            <span class="lp-hl">a venda esfria antes de acontecer.</span>
          </h2>
          <p class="lp-section-text" data-reveal>
            O problema não é falta de interesse. O problema é perder clareza, velocidade e confiança no meio
            do processo comercial.
          </p>
        </div>

        <div class="lp-pain-grid">
          <article v-for="item in painPoints" :key="item.title" class="lp-card lp-card--pain" data-reveal>
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section id="features" class="lp-section lp-section--solution">
      <div class="lp-container" data-reveal-group>
        <div class="lp-section-head">
          <div class="lp-badge-green" data-reveal>Como a Lotio muda o jogo</div>
          <h2 class="lp-section-title" data-reveal>
            Menos fricção para o cliente.
            <span class="lp-hl">Mais contexto para o time comercial.</span>
          </h2>
          <p class="lp-section-text" data-reveal>
            A página deixa de ser uma vitrine passiva e passa a funcionar como uma estrutura de venda
            conectada ao seu estoque e à sua operação.
          </p>
        </div>
      </div>

      <div class="lp-container">
        <article
          v-for="feature in featureSections"
          :key="feature.title"
          class="lp-feature"
          :class="{ 'lp-feature--reverse': feature.reverse }"
          data-reveal-group
        >
          <div class="lp-feature-copy" data-reveal>
            <span class="lp-feature-eyebrow">{{ feature.eyebrow }}</span>
            <h3 class="lp-feature-title">{{ feature.title }}</h3>
            <p class="lp-feature-text">{{ feature.description }}</p>
            <ul class="lp-feature-list">
              <li v-for="bullet in feature.bullets" :key="bullet">{{ bullet }}</li>
            </ul>
          </div>

          <figure class="lp-feature-media" data-reveal>
            <img :src="feature.image" :alt="feature.alt" loading="lazy" />
          </figure>
        </article>
      </div>
    </section>

    <section class="lp-section">
      <div class="lp-container" data-reveal-group>
        <div class="lp-section-head">
          <div class="lp-badge-green" data-reveal>Quem ganha com isso</div>
          <h2 class="lp-section-title" data-reveal>
            Uma operação mais clara para quem vende, para quem gerencia e para quem precisa escalar.
          </h2>
        </div>

        <div class="lp-persona-grid">
          <article v-for="persona in personas" :key="persona.title" class="lp-card lp-card--persona" data-reveal>
            <h3>{{ persona.title }}</h3>
            <ul>
              <li v-for="point in persona.points" :key="point">{{ point }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="lp-section lp-section--gallery">
      <div class="lp-container" data-reveal-group>
        <div class="lp-gallery-copy" data-reveal>
          <div class="lp-badge">Recursos que ajudam a vender</div>
          <h2 class="lp-section-title">Mais argumento visual para o cliente decidir.</h2>
          <p class="lp-section-text">
            Planta, 360, proximidades, localização e simulação financeira trabalhando juntos para reduzir
            indecisão e aumentar a qualidade da conversa comercial.
          </p>
        </div>

        <div class="lp-gallery-grid">
          <img data-reveal src="/img/landing/loteamento_desk_360.png" alt="Panorama 360 do empreendimento" loading="lazy" />
          <img data-reveal src="/img/landing/lote_desk_localizacao.png" alt="Mapa de localização do lote" loading="lazy" />
          <img data-reveal src="/img/landing/loteamento_desk_proximidades.png" alt="Tela de proximidades do empreendimento" loading="lazy" />
          <img data-reveal src="/img/landing/lote_desk_simulador_terreno.png" alt="Simulador do terreno" loading="lazy" />
        </div>
      </div>
    </section>

    <section class="lp-section">
      <div class="lp-container" data-reveal-group>
        <div class="lp-section-head">
          <div class="lp-badge-dark" data-reveal>Objeções comuns</div>
          <h2 class="lp-section-title" data-reveal>O que normalmente perguntam antes de entrar.</h2>
        </div>

        <div class="lp-faq-grid">
          <article v-for="item in faqItems" :key="item.question" class="lp-card lp-card--faq" data-reveal>
            <h3>{{ item.question }}</h3>
            <p>{{ item.answer }}</p>
          </article>
        </div>
      </div>
    </section>

        <section class="lp-section lp-section--prelaunch">
      <div class="lp-container" data-reveal-group>
        <div class="lp-prelaunch-section" data-reveal>
          <div class="lp-prelaunch-section__copy">
            <div class="lp-prelaunch-spotlight__badge">Modo pré-lançamento</div>
            <h2 class="lp-section-title lp-section-title--prelaunch">
              Capte interesse antes da abertura oficial com fila de preferência e acesso antecipado exclusivo.
            </h2>
            <p class="lp-section-text lp-section-text--prelaunch">
              Em vez de empurrar reserva cedo demais, sua landing passa a captar leads qualificados em fila,
              mantendo o interesse aquecido até a virada comercial do empreendimento.
            </p>
          </div>

          <div class="lp-prelaunch-section__panel">
            <ul class="lp-prelaunch-spotlight__list">
              <li v-for="item in preLaunchItems" :key="item">{{ item }}</li>
            </ul>

            <button type="button" class="lp-prelaunch-spotlight__cta" @click="scrollToForm">
              Quero ativar esse fluxo
            </button>
          </div>
        </div>
      </div>
    </section>


    <section id="cta" class="lp-section lp-section--final" data-reveal-group>
      <div class="lp-container">
        <div class="lp-final-card" data-reveal>
          <div>
            <div class="lp-badge">Próximo passo</div>
            <h2 class="lp-final-title">
              Se você está comprando tráfego para vender lotes, sua landing precisa responder como um time comercial.
            </h2>
            <p class="lp-final-text">
              Vamos olhar seu cenário atual e mostrar como essa estrutura pode funcionar no seu empreendimento.
            </p>
          </div>

          <div class="lp-final-actions">
            <button class="lp-btn-primary" @click="scrollToForm">Solicitar demonstração</button>
            <button v-if="settings?.contactWhatsapp" class="lp-btn-secondary" @click="openWhatsapp">
              Chamar no WhatsApp
            </button>
          </div>
        </div>
      </div>
    </section>

    <button v-if="isMobileViewport" type="button" class="lp-mobile-fab" @click="openMobileForm">
      Solicitar demonstração
    </button>

    <transition name="lp-modal-fade">
      <div v-if="isMobileViewport && isMobileFormOpen" class="lp-mobile-modal" @click.self="closeMobileForm">
        <div class="lp-mobile-sheet">
          <div class="lp-mobile-sheet-header">
            <div class="lp-mobile-sheet-heading">
              <strong>Solicitar demonstração</strong>
              <span>Preencha e nossa equipe retorna com contexto do seu cenário.</span>
            </div>
            <button type="button" class="lp-mobile-close" @click="closeMobileForm">Fechar</button>
          </div>

          <div class="lp-mobile-sheet-body">
            <div v-if="submitted" class="lp-form-success lp-form-success--mobile">
              <div class="lp-success-icon">✓</div>
              <h3>Solicitação enviada</h3>
              <p>Nossa equipe comercial entra em contato em até 1 dia útil para mostrar a plataforma no seu contexto.</p>
              <button v-if="settings?.contactWhatsapp" class="lp-btn-whatsapp" @click="openWhatsapp">
                Falar agora no WhatsApp
              </button>
            </div>

            <form v-else class="lp-form lp-form--mobile" @submit.prevent="submitForm">
              <div class="lp-form-header">
                <h2 class="lp-form-title">Solicitar demonstração comercial</h2>
                <p class="lp-form-subtitle">Preencha em menos de 30 segundos.</p>
              </div>

              <div class="lp-field">
                <label>Nome completo</label>
                <input v-model="form.name" type="text" placeholder="Seu nome" required />
              </div>
              <div class="lp-field">
                <label>E-mail</label>
                <input v-model="form.email" type="email" placeholder="seu@email.com" required />
              </div>
              <div class="lp-field">
                <label>WhatsApp</label>
                <input
                  :value="form.phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  required
                  @input="form.phone = applyPhoneMask($event.target.value)"
                />
              </div>
              <div class="lp-field">
                <label>Empresa / Empreendimento</label>
                <input v-model="form.company" type="text" placeholder="Nome da empresa ou projeto" />
              </div>
              <div class="lp-field">
                <label>Seu perfil</label>
                <select v-model="form.role">
                  <option value="">Selecione</option>
                  <option>Diretor / Proprietário</option>
                  <option>Gerente Comercial</option>
                  <option>Corretor de Imóveis</option>
                  <option>Gerente de Marketing</option>
                  <option>Responsável de TI</option>
                  <option>Outro</option>
                </select>
              </div>
              <div class="lp-field">
                <label>O que você precisa resolver? (opcional)</label>
                <textarea v-model="form.message" rows="3" placeholder="Descreva rapidamente seu cenário."></textarea>
              </div>

              <button type="submit" class="lp-btn-primary lp-btn-primary--full" :disabled="submitting">
                {{ submitting ? 'Enviando...' : 'Quero ver na prática' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </transition>

    <LandingFooter />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildRobotsContent,
  normalizeSiteOrigin,
  resolveSeoImage,
} from '~/utils/seo'

definePageMeta({ layout: 'public', alias: ['/demo'] })

const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()
const siteOrigin = computed(() => normalizeSiteOrigin(runtimeConfig.public.siteUrl, requestUrl.origin))
const canonicalUrl = computed(() => buildCanonicalUrl(siteOrigin.value, '/landing'))
const seoImage = computed(() => resolveSeoImage(siteOrigin.value, '/img/landing/loteamento_desk_topo.png'))
const seoTitle = 'Lotio | Landing para vender loteamentos com mais contexto e menos atrito'
const seoDescription = 'Transforme PDF, planilha e atendimento sem contexto em uma operação comercial com mapa interativo, leads identificados e reserva online.'
const seoImageAlt = 'Tela da landing da Lotio para venda de loteamentos com mapa interativo e contexto comercial'
const robotsContent = buildRobotsContent(false)
const seoSchema = computed(() => ([
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seoTitle,
    description: seoDescription,
    url: canonicalUrl.value,
    primaryImageOfPage: seoImage.value,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Lotio',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: canonicalUrl.value,
    description: seoDescription,
    image: seoImage.value,
  },
]))

useSeoMeta({
  title: seoTitle,
  ogTitle: seoTitle,
  description: seoDescription,
  ogDescription: seoDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogImage: seoImage,
  ogSiteName: 'Lotio',
  ogLocale: 'pt_BR',
  ogImageAlt: seoImageAlt,
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
  twitterImageAlt: seoImageAlt,
  robots: robotsContent,
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: canonicalUrl.value },
    { rel: 'image_src', href: seoImage.value },
  ],
  script: [
    {
      key: 'landing-ld-json',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(seoSchema.value),
    },
  ],
}))

const { get, post } = usePublicApi()
const toast = useToast()
const pageRef = ref(null)
const settings = ref(null)
const submitting = ref(false)
const submitted = ref(false)
const isScrolled = ref(false)
const isMobileViewport = ref(false)
const isMobileFormOpen = ref(false)

const trustItems = ['Loteadoras', 'Incorporadoras', 'Imobiliárias', 'Corretores parceiros']

const proofItems = [
  'Estoque visual atualizado em tempo real',
  'Lead chega com lote, quadra e contexto',
  'Modo pré-lançamento com fila de preferência',
  'Reserva online com gateway integrado',
]

const preLaunchItems = [
  'Fila de preferência por empreendimento e por lote',
  'Comunicação de acesso antecipado para aquecer a base',
  'Troca simples para reserva normal quando a venda abrir',
]

const painPoints = [
  {
    title: 'PDF bonito, operação travada',
    text: 'O cliente navega pouco, depende de atendimento e esfria antes do corretor responder.',
  },
  {
    title: 'Lead chega sem contexto',
    text: 'A equipe perde tempo tentando descobrir qual lote, qual projeto e em que estágio está o interesse.',
  },
  {
    title: 'Estoque perde credibilidade',
    text: 'Planilha, repasse manual e reserva fora do fluxo geram conflito e insegurança para a venda.',
  },
  {
    title: 'Marketing não enxerga origem',
    text: 'Você investe em tráfego e parceiros, mas não sabe qual corretor, anúncio ou canal realmente converteu.',
  },
]

const featureSections = [
  {
    eyebrow: 'Mapa comercial vivo',
    title: 'Mostre disponibilidade real e reduza atrito logo no primeiro clique.',
    description: 'Em vez de mandar PDF e esperar atendimento, o cliente entende o empreendimento, filtra opções e chega mais pronto para conversar.',
    bullets: [
      'Mapa interativo com status do lote em tempo real',
      'Filtros por quadra, preço, área e disponibilidade',
      'Experiência boa em desktop, celular e totem',
    ],
    image: '/img/landing/loteamentos_desk_lotes.png',
    alt: 'Mapa interativo do loteamento com disponibilidade em tempo real',
  },
  {
    eyebrow: 'Atendimento com contexto',
    title: 'Cada lead chega com mais clareza para o corretor agir rápido.',
    description: 'O Lotio encurta o caminho entre interesse e atendimento, conectando lote, ficha, simulação e dados do contato no mesmo fluxo.',
    bullets: [
      'Ficha do lote com informações comerciais organizadas',
      'Interesse identificado antes do primeiro contato',
      'Menos conversa perdida e follow-up mais forte',
    ],
    image: '/img/landing/lote-desk-ficha.png',
    alt: 'Ficha detalhada do lote com informações comerciais',
    reverse: true,
  },
  {
    eyebrow: 'Fechamento e decisão',
    title: 'Ajude o cliente a sair da curiosidade e entrar na negociação.',
    description: 'Simulação financeira, visão de terreno, panorama e proximidades deixam a proposta mais concreta e reduzem fricção comercial.',
    bullets: [
      'Simulador financeiro no fluxo da descoberta',
      'Vista 360 e visão do terreno para dar segurança',
      'Localização e proximidades reforçando valor percebido',
    ],
    image: '/img/landing/lote_desk_simulador_financeiro.png',
    alt: 'Simulador financeiro do lote',
  },
  {
    eyebrow: 'Operação e reserva',
    title: 'Conecte venda, controle e reserva sem depender de repasse manual.',
    description: 'Sua equipe comercial acompanha o que entrou, o que aqueceu e o que foi reservado sem quebrar o fluxo entre marketing, corretor e financeiro.',
    bullets: [
      'Reserva online com PIX e cartão após configuração',
      'Rastreamento por corretor e por origem',
      'Mais governança para loteadora e imobiliária',
    ],
    image: '/img/landing/loteamento_chatbot_ia.png',
    alt: 'Painel com atendimento e automacao comercial',
    reverse: true,
  },
]

const personas = [
  {
    title: 'Loteadora',
    points: [
      'Controla estoque, lead e reserva no mesmo lugar',
      'Atualiza o empreendimento sem depender de agência ou TI',
      'Ganha visibilidade sobre operação e performance',
    ],
  },
  {
    title: 'Imobiliária',
    points: [
      'Organiza equipe e parceiros com mais governança',
      'Enxerga origem, atendimento e evolução do lead',
      'Evita perda de contexto entre marketing e venda',
    ],
  },
  {
    title: 'Corretor',
    points: [
      'Recebe lead mais pronto para atendimento',
      'Compartilha links rastreados do próprio empreendimento',
      'Vende com mais argumento visual e menos retrabalho',
    ],
  },
]

const faqItems = [
  {
    question: 'Preciso de equipe técnica para operar?',
    answer: 'Não. A proposta da plataforma é dar autonomia comercial e operacional para publicar, atualizar e acompanhar o empreendimento com menos dependência externa.',
  },
  {
    question: 'Funciona no celular e em estande?',
    answer: 'Sim. A experiência foi pensada para mobile, desktop e uso em telas de apoio no estande de vendas.',
  },
  {
    question: 'Dá para usar com corretores e imobiliárias parceiras?',
    answer: 'Sim. A plataforma foi desenhada para operações com loteadora, imobiliária e corretores trabalhando no mesmo ecossistema comercial.',
  },
  {
    question: 'A reserva online depende de integração?',
    answer: 'Sim. O fluxo de cobrança entra em operação após a configuração do gateway de pagamento compatível.',
  },
]

const form = ref({
  name: '',
  email: '',
  phone: '',
  company: '',
  role: '',
  message: '',
})

const updateViewportState = () => {
  isMobileViewport.value = window.innerWidth < 768
  if (!isMobileViewport.value) {
    isMobileFormOpen.value = false
  }
}

const onScroll = () => {
  isScrolled.value = window.scrollY > 24
}

const runWhenBrowserIdle = (callback) => {
  if (typeof window === 'undefined') return

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      void callback()
    }, { timeout: 1200 })
    return
  }

  window.setTimeout(() => {
    void callback()
  }, 1)
}

watch(isMobileFormOpen, (open) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : ''
  }
})

onMounted(async () => {
  updateViewportState()
  onScroll()

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', updateViewportState, { passive: true })

  runWhenBrowserIdle(async () => {
    try {
      settings.value = await get('/p/settings')
    } catch {
      // silent
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', updateViewportState)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

const openWhatsapp = () => {
  if (!settings.value?.contactWhatsapp) return
  const phone = settings.value.contactWhatsapp.replace(/\D/g, '')
  const text = encodeURIComponent('Olá! Vim pela landing da Lotio e quero ver como aplicar isso no meu empreendimento.')
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
}

const submitForm = async () => {
  submitting.value = true
  try {
    await post('/p/settings/contact', {
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone,
      message: `[${form.value.role || 'Cargo não informado'} | ${form.value.company || 'Empresa não informada'}] ${form.value.message || ''}`.trim(),
    })
    submitted.value = true
  } catch {
    toast.error('Erro ao enviar solicitação. Tente novamente.')
  } finally {
    submitting.value = false
  }
}

const openMobileForm = () => {
  isMobileFormOpen.value = true
}

const closeMobileForm = () => {
  isMobileFormOpen.value = false
}

const scrollToForm = () => {
  if (isMobileViewport.value) {
    openMobileForm()
    return
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.lp-root {
  --lp-space-1: 12px;
  --lp-space-2: 16px;
  --lp-space-3: 24px;
  --lp-space-4: 32px;
  --lp-space-5: 40px;
  --lp-space-6: 56px;
  --lp-space-7: 72px;
  color: #10221b;
  background:
    radial-gradient(circle at top left, rgba(18, 179, 117, 0.09), transparent 28%),
    linear-gradient(180deg, #fbf9f4 0%, #f3efe5 100%);
  overflow-x: hidden;
}

.lp-container {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
}

.lp-hl {
  color: #0d8f61;
}

.lp-badge,
.lp-badge-dark,
.lp-badge-green {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lp-badge,
.lp-badge-green {
  background: rgba(13, 143, 97, 0.1);
  color: #0d8f61;
  border: 1px solid rgba(13, 143, 97, 0.14);
}

.lp-badge-dark {
  background: #173127;
  color: #f7f2e8;
}

.lp-hero {
  position: relative;
  padding: 104px 0 var(--lp-space-7);
}

.lp-hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 80% 18%, rgba(13, 143, 97, 0.12), transparent 24%),
    radial-gradient(circle at 20% 0%, rgba(210, 173, 98, 0.16), transparent 26%);
  pointer-events: none;
}

.lp-hero-inner {
  position: relative;
  display: grid;
  gap: var(--lp-space-5);
}

.lp-hero-title {
  margin: var(--lp-space-3) 0 0;
  max-width: 12ch;
  font-size: clamp(2.5rem, 6vw, 5.3rem);
  line-height: 0.98;
  letter-spacing: -0.06em;
  font-weight: 900;
  color: #173127;
}

.lp-hero-subtitle,
.lp-section-text,
.lp-feature-text,
.lp-final-text,
.lp-card p,
.lp-form-subtitle,
.lp-form-footnote {
  color: #52645b;
  line-height: 1.75;
}

.lp-hero-subtitle {
  max-width: 62ch;
  margin: var(--lp-space-3) 0 0;
  font-size: 1.08rem;
}

.lp-hero-actions,
.lp-final-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--lp-space-2);
  margin-top: var(--lp-space-4);
}

.lp-btn-primary,
.lp-btn-secondary,
.lp-btn-whatsapp,
.lp-mobile-fab,
.lp-mobile-close {
  border: 0;
  border-radius: 16px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.lp-btn-primary {
  padding: 15px 20px;
  color: #fff;
  background: linear-gradient(135deg, #0d8f61, #127e59);
  box-shadow: 0 18px 40px rgba(13, 143, 97, 0.24);
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.lp-btn-primary:hover:not(:disabled),
.lp-btn-secondary:hover,
.lp-btn-whatsapp:hover,
.lp-mobile-fab:hover {
  transform: translateY(-2px);
}

.lp-btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lp-btn-primary--full {
  width: 100%;
}

.lp-btn-secondary {
  padding: 15px 20px;
  background: rgba(23, 49, 39, 0.06);
  color: #173127;
}

.lp-btn-whatsapp {
  padding: 14px 18px;
  background: #25d366;
  color: #fff;
}

.lp-proof-list,
.lp-feature-list,
.lp-card ul {
  display: grid;
  gap: 12px;
  padding: 0;
  list-style: none;
}

.lp-proof-list {
  margin: var(--lp-space-4) 0 0;
}

.lp-proof-list li,
.lp-feature-list li,
.lp-card li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #244137;
}

.lp-proof-list li::before,
.lp-feature-list li::before,
.lp-card li::before {
  content: '';
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #0d8f61;
  flex: 0 0 9px;
  margin-top: 7px;
}

.lp-hero-side {
  display: grid;
  gap: var(--lp-space-3);
}

.lp-section--prelaunch {
  padding-top: 0;
}

.lp-prelaunch-section {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
  padding: 28px;
  border-radius: 32px;
  background:
    linear-gradient(145deg, rgba(240, 97, 74, 0.1), rgba(13, 143, 97, 0.06)),
    rgba(255, 251, 245, 0.96);
  border: 1px solid rgba(240, 97, 74, 0.18);
  box-shadow: 0 22px 60px rgba(112, 62, 28, 0.1);
}

.lp-prelaunch-section__copy {
  display: grid;
  align-content: start;
  gap: 16px;
}

.lp-prelaunch-section__panel {
  display: grid;
  gap: 18px;
  align-content: start;
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(23, 49, 39, 0.08);
}

.lp-section-title--prelaunch,
.lp-section-text--prelaunch {
  max-width: 100%;
}

.lp-prelaunch-spotlight {
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  background:
    linear-gradient(145deg, rgba(240, 97, 74, 0.12), rgba(13, 143, 97, 0.08)),
    rgba(255, 251, 245, 0.96);
  border: 1px solid rgba(240, 97, 74, 0.18);
  box-shadow: 0 22px 60px rgba(112, 62, 28, 0.12);
}

.lp-prelaunch-spotlight__badge {
  display: inline-flex;
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(126, 34, 12, 0.08);
  color: #9a3412;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lp-prelaunch-spotlight__title {
  margin: 0;
  font-size: 1.45rem;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #173127;
}

.lp-prelaunch-spotlight__text {
  margin: 0;
  color: #52645b;
  line-height: 1.7;
}

.lp-prelaunch-spotlight__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lp-prelaunch-spotlight__list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #244137;
}

.lp-prelaunch-spotlight__list li::before {
  content: '';
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f0614a, #0d8f61);
  flex: 0 0 9px;
  margin-top: 7px;
}

.lp-prelaunch-spotlight__cta {
  border: 0;
  border-radius: 14px;
  padding: 14px 18px;
  width: 100%;
  font: inherit;
  font-weight: 800;
  color: #fffdf9;
  background: linear-gradient(135deg, #d9485f, #b45309);
  box-shadow: 0 18px 40px rgba(180, 83, 9, 0.22);
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.lp-prelaunch-spotlight__cta:hover {
  transform: translateY(-2px);
}

@media (max-width: 900px) {
  .lp-prelaunch-section {
    grid-template-columns: 1fr;
    padding: 22px;
    border-radius: 24px;
  }

  .lp-prelaunch-section__panel {
    padding: 18px;
    border-radius: 20px;
  }
}

.lp-hero-visual,
.lp-form-card,
.lp-card,
.lp-feature-media,
.lp-final-card,
.lp-gallery-grid img {
  border: 1px solid rgba(23, 49, 39, 0.08);
  box-shadow: 0 24px 80px rgba(23, 49, 39, 0.08);
}

.lp-hero-visual,
.lp-feature-media,
.lp-gallery-grid img {
  overflow: hidden;
  border-radius: 28px;
  background: #fff;
}

.lp-hero-image,
.lp-feature-media img,
.lp-gallery-grid img {
  display: block;
  width: 100%;
  height: auto;
}

.lp-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px;
  background: #fffdf9;
}

.lp-hero-tags span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(23, 49, 39, 0.06);
  font-size: 0.84rem;
  font-weight: 700;
  color: #244137;
}

.lp-form-card {
  overflow: hidden;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
}

.lp-form-card.is-scrolled {
  box-shadow: 0 26px 90px rgba(13, 143, 97, 0.14);
}

.lp-form,
.lp-form--mobile {
  display: grid;
  gap: var(--lp-space-2);
  padding: var(--lp-space-4);
}

.lp-form--mobile {
  padding-top: 20px;
}

.lp-form-title {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.1;
  font-weight: 800;
  color: #173127;
}

.lp-field {
  display: grid;
  gap: 7px;
}

.lp-field-row {
  display: grid;
  gap: var(--lp-space-2);
}

.lp-form-footnote {
  margin: 0;
  text-align: center;
}

.lp-field label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #375247;
}

.lp-field input,
.lp-field select,
.lp-field textarea {
  width: 100%;
  border: 1px solid rgba(23, 49, 39, 0.12);
  border-radius: 14px;
  padding: 14px 15px;
  background: #fcfbf7;
  color: #173127;
  font: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.lp-field input:focus,
.lp-field select:focus,
.lp-field textarea:focus {
  border-color: rgba(13, 143, 97, 0.54);
  box-shadow: 0 0 0 4px rgba(13, 143, 97, 0.12);
  transform: translateY(-1px);
  background: #fff;
}

.lp-field textarea {
  min-height: 104px;
  resize: vertical;
}

.lp-form-success {
  display: grid;
  justify-items: center;
  gap: var(--lp-space-2);
  padding: var(--lp-space-5) var(--lp-space-4);
  text-align: center;
}

.lp-success-icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: 999px;
  background: rgba(13, 143, 97, 0.12);
  color: #0d8f61;
  font-size: 1.6rem;
  font-weight: 800;
}

.lp-trust,
.lp-section {
  padding: var(--lp-space-6) 0;
}

.lp-section + .lp-section {
  padding-top: var(--lp-space-6);
}

.lp-section[id] {
  scroll-margin-top: 92px;
}

.lp-trust + .lp-section {
  padding-top: var(--lp-space-6);
}

.lp-trust {
  border-top: 1px solid rgba(23, 49, 39, 0.08);
  border-bottom: 1px solid rgba(23, 49, 39, 0.08);
  background: rgba(255, 253, 249, 0.8);
}

.lp-trust-inner {
  display: grid;
  gap: var(--lp-space-2);
}

.lp-trust-label {
  color: #52645b;
  font-size: 0.92rem;
  font-weight: 700;
}

.lp-trust-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--lp-space-1);
}

.lp-trust-item {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(23, 49, 39, 0.06);
  color: #244137;
  font-size: 0.9rem;
  font-weight: 700;
}

.lp-section--pain,
.lp-section--gallery {
  background: linear-gradient(180deg, rgba(23, 49, 39, 0.04), rgba(23, 49, 39, 0));
}

.lp-section-head,
.lp-gallery-copy {
  max-width: 780px;
  margin: 0 auto var(--lp-space-5);
  text-align: center;
}

.lp-section-title,
.lp-final-title {
  margin: var(--lp-space-2) 0 0;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1.04;
  letter-spacing: -0.05em;
  font-weight: 900;
  color: #173127;
}

.lp-pain-grid,
.lp-persona-grid,
.lp-faq-grid,
.lp-gallery-grid {
  display: grid;
  gap: var(--lp-space-3);
}

.lp-card {
  padding: 28px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
}

.lp-card h3,
.lp-feature-title {
  margin: 0;
  color: #173127;
}

.lp-feature {
  display: grid;
  gap: var(--lp-space-4);
  align-items: center;
  margin-top: 0;
  padding: var(--lp-space-5) 0;
}

.lp-feature + .lp-feature {
  border-top: 1px solid rgba(23, 49, 39, 0.08);
}

.lp-feature-eyebrow {
  display: inline-block;
  margin-bottom: var(--lp-space-1);
  color: #0d8f61;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lp-feature-title {
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.lp-feature-text {
  margin: var(--lp-space-2) 0 0;
}

.lp-feature-list {
  margin-top: var(--lp-space-3);
}

.lp-card--persona {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 242, 232, 0.92));
}

.lp-final-card {
  display: grid;
  gap: var(--lp-space-4);
  padding: var(--lp-space-5);
  border-radius: 28px;
  background: linear-gradient(135deg, #173127, #0f2119);
}

.lp-final-card .lp-badge,
.lp-final-title,
.lp-final-text {
  color: #f8f3ea;
}

.lp-final-card .lp-badge {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.1);
}

.lp-final-card > div:first-child {
  max-width: 900px;
}

.lp-final-actions {
  margin-top: 0;
  align-items: center;
}

.lp-mobile-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 960;
  padding: 14px 18px;
  background: #0d8f61;
  color: #fff;
  box-shadow: 0 18px 44px rgba(13, 143, 97, 0.35);
}

.lp-mobile-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  align-items: end;
  padding: max(16px, env(safe-area-inset-top)) 12px 0;
  background: rgba(10, 18, 14, 0.48);
}

.lp-mobile-sheet {
  width: min(100%, 560px);
  max-height: min(820px, calc(100dvh - max(16px, env(safe-area-inset-top)) - 12px));
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border-radius: 26px 26px 0 0;
  background: #fbf9f4;
  box-shadow: 0 -24px 60px rgba(15, 33, 25, 0.22);
}

.lp-mobile-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 18px 20px 16px;
  border-bottom: 1px solid rgba(23, 49, 39, 0.08);
  background: rgba(251, 249, 244, 0.94);
  backdrop-filter: blur(12px);
  color: #173127;
}

.lp-mobile-sheet-heading {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.lp-mobile-sheet-heading span {
  color: #52645b;
  font-size: 0.8rem;
  line-height: 1.45;
}

.lp-mobile-sheet-body {
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.lp-mobile-close {
  padding: 10px 12px;
  background: rgba(23, 49, 39, 0.06);
  color: #173127;
  flex: 0 0 auto;
}

.lp-modal-fade-enter-active,
.lp-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.lp-modal-fade-enter-from,
.lp-modal-fade-leave-to {
  opacity: 0;
}

@media (min-width: 720px) {
  .lp-field-row,
  .lp-pain-grid,
  .lp-persona-grid,
  .lp-faq-grid,
  .lp-gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lp-section-head,
  .lp-gallery-copy {
    margin-bottom: 48px;
  }
}

@media (min-width: 1024px) {
  .lp-hero {
    padding-top: 118px;
  }

  .lp-hero-inner,
  .lp-feature {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  }

  .lp-final-card {
    grid-template-columns: 1fr;
  }

  .lp-feature--reverse .lp-feature-copy {
    order: 2;
  }

  .lp-feature--reverse .lp-feature-media {
    order: 1;
  }

  .lp-pain-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .lp-persona-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .lp-gallery-grid {
    grid-template-columns: 1.15fr 0.85fr;
    align-items: stretch;
  }

  .lp-gallery-grid img {
    height: 100%;
    object-fit: cover;
  }
}

@media (max-width: 767px) {
  .lp-root {
    --lp-space-3: 20px;
    --lp-space-4: 24px;
    --lp-space-5: 32px;
    --lp-space-6: 48px;
    --lp-space-7: 56px;
  }

  .lp-trust,
  .lp-section {
    padding: var(--lp-space-6) 0;
  }

  .lp-form,
  .lp-form--mobile,
  .lp-final-card {
    padding: var(--lp-space-3);
  }

  .lp-form-card {
    display: none;
  }

  .lp-section-head,
  .lp-gallery-copy {
    margin-bottom: var(--lp-space-4);
  }

  .lp-section-title,
  .lp-final-title {
    font-size: clamp(1.95rem, 8.5vw, 2.8rem);
    line-height: 1.02;
  }

  .lp-hero-title {
    max-width: none;
    font-size: clamp(2.35rem, 11vw, 3.8rem);
  }

  .lp-hero-actions,
  .lp-final-actions {
    display: grid;
    gap: var(--lp-space-1);
  }

  .lp-btn-primary,
  .lp-btn-secondary,
  .lp-btn-whatsapp {
    width: 100%;
    justify-content: center;
  }

  .lp-mobile-sheet {
    max-height: calc(100dvh - max(12px, env(safe-area-inset-top)) - 8px);
    border-radius: 24px 24px 0 0;
  }

  .lp-mobile-sheet-header {
    align-items: flex-start;
    padding: 16px 16px 14px;
  }

  .lp-mobile-sheet-body {
    padding-bottom: max(18px, env(safe-area-inset-bottom));
  }

  .lp-form--mobile {
    gap: 14px;
  }

  .lp-form-success--mobile {
    padding: var(--lp-space-4) var(--lp-space-3) calc(var(--lp-space-4) + env(safe-area-inset-bottom));
  }

  .lp-card {
    padding: var(--lp-space-3);
  }

  .lp-feature {
    padding: var(--lp-space-4) 0;
  }

  .lp-mobile-sheet-header strong {
    font-size: 1rem;
    line-height: 1.2;
  }

  .lp-mobile-close {
    padding: 10px;
  }
}
</style>
