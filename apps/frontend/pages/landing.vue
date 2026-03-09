<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'

// ── Demo map reactive state ──────────────────────────────────────
const demoLots = ref(
  Array.from({ length: 18 }, (_, i) => ({ id: i + 1, state: 'available' }))
)
const initSold = [2, 5, 9, 13, 16]
const initReserved = [4, 11]
initSold.forEach(i => { demoLots.value[i - 1].state = 'sold' })
initReserved.forEach(i => { demoLots.value[i - 1].state = 'reserved' })

const demoLotEls = ref([])
let demoTicker = null

// Section refs for GSAP ScrollTrigger
const heroSectionRef = ref(null)
const heroCopyRef = ref(null)
const heroFormCardRef = ref(null)
const trustStripRef = ref(null)
const painSectionRef = ref(null)
const featuresSectionRef = ref(null)
const moreFeaturesSectionRef = ref(null)
const howSectionRef = ref(null)
const ctaFinalRef = ref(null)

definePageMeta({ layout: 'public', alias: ['/demo'] })

useSeoMeta({
  title: 'Landing — Lotio',
  ogTitle: 'Landing — Lotio',
  description:
    'Veja como loteadoras, incorporadoras e imobiliárias estão vendendo mais com mapas interativos, captura de leads em tempo real e reservas online.',
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image',
})

const { get, post } = usePublicApi()
const toast = useToast()
const settings = ref(null)
const submitting = ref(false)
const submitted = ref(false)
const isScrolled = ref(false)
const isMobileViewport = ref(false)
const isMobileFormOpen = ref(false)

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

watch(isMobileFormOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(async () => {
  updateViewportState()

  try {
    settings.value = await get('/p/settings')
  } catch (e) {
    // silent
  }
  window.addEventListener('scroll', onScroll)
  window.addEventListener('resize', updateViewportState)

  // GSAP entrance for demo map
  const els = demoLotEls.value.filter(Boolean)
  if (els.length) {
    gsap.from(els, {
      opacity: 0,
      scale: 0.5,
      duration: 0.5,
      stagger: { amount: 1.1, from: 'random', ease: 'none' },
      ease: 'back.out(1.6)',
      delay: 0.4
    })
  }

  // ── GSAP scroll-triggered animations ──
  nextTick(() => {
    // Hero entrance: replace CSS keyframe anims with GSAP timeline
    if (heroCopyRef.value) {
      const badge = heroCopyRef.value.querySelector('.lp-badge')
      const h1 = heroCopyRef.value.querySelector('.lp-hero-h1')
      const sub = heroCopyRef.value.querySelector('.lp-hero-sub')
      const stats = heroCopyRef.value.querySelector('.lp-hero-stats')

      const heroTl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      if (badge) {
        gsap.set(badge, { opacity: 0, y: 30, scale: 0.8 })
        heroTl.to(badge, { opacity: 1, y: 0, scale: 1, duration: 0.6 })
      }
      if (h1) {
        gsap.set(h1, { opacity: 0, y: 60 })
        heroTl.to(h1, { opacity: 1, y: 0, duration: 1.1 }, '-=0.3')
      }
      if (sub) {
        gsap.set(sub, { opacity: 0, y: 40 })
        heroTl.to(sub, { opacity: 1, y: 0, duration: 0.9 }, '-=0.6')
      }
      if (stats) {
        const statItems = stats.children
        gsap.set(statItems, { opacity: 0, y: 25 })
        heroTl.to(statItems, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, '-=0.4')
      }
    }

    // Form card entrance
    if (heroFormCardRef.value) {
      gsap.set(heroFormCardRef.value, { opacity: 0, y: 50, scale: 0.94 })
      gsap.to(heroFormCardRef.value, {
        opacity: 1, y: 0, scale: 1,
        duration: 1,
        delay: 0.3,
        ease: 'back.out(1.3)'
      })
    }

    // Trust strip
    if (trustStripRef.value) {
      const badges = trustStripRef.value.querySelectorAll('.lp-trust-badge, .lp-trust-label, .lp-trust-sep')
      gsap.set(badges, { opacity: 0, y: 15 })
      gsap.to(badges, {
        opacity: 1, y: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: { trigger: trustStripRef.value, start: 'top 90%', once: true }
      })
    }

    // Pain section: cards stagger from below
    if (painSectionRef.value) {
      const painHeader = painSectionRef.value.querySelector('.lp-section-header')
      const painCards = painSectionRef.value.querySelectorAll('.lp-pain-card')

      if (painHeader) {
        gsap.set(painHeader.children, { opacity: 0, y: 40 })
        gsap.to(painHeader.children, {
          opacity: 1, y: 0,
          duration: 0.9, stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: painHeader, start: 'top 82%', once: true }
        })
      }
      if (painCards.length) {
        gsap.set(painCards, { opacity: 0, y: 60, scale: 0.93 })
        gsap.to(painCards, {
          opacity: 1, y: 0, scale: 1,
          duration: 0.7, stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: painCards[0], start: 'top 85%', once: true }
        })
      }
    }

    // Features section: alternating slide-in
    if (featuresSectionRef.value) {
      const featHeader = featuresSectionRef.value.querySelector('.lp-section-header')
      if (featHeader) {
        gsap.set(featHeader.children, { opacity: 0, y: 50 })
        gsap.to(featHeader.children, {
          opacity: 1, y: 0,
          duration: 1, stagger: 0.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: featHeader, start: 'top 82%', once: true }
        })
      }

      const featBlocks = featuresSectionRef.value.querySelectorAll('.lp-feat-block')
      featBlocks.forEach((block, i) => {
        const copy = block.querySelector('.lp-feat-copy')
        const visual = block.querySelector('.lp-feat-visual')
        const isReversed = block.classList.contains('lp-feat-block--rev')
        const xDir = isReversed ? 60 : -60

        if (copy) {
          gsap.set(copy, { opacity: 0, x: xDir })
          gsap.to(copy, {
            opacity: 1, x: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: block, start: 'top 78%', once: true }
          })
        }
        if (visual) {
          gsap.set(visual, { opacity: 0, x: -xDir, scale: 0.92 })
          gsap.to(visual, {
            opacity: 1, x: 0, scale: 1,
            duration: 1,
            delay: 0.15,
            ease: 'power3.out',
            scrollTrigger: { trigger: block, start: 'top 78%', once: true }
          })
        }
      })
    }

    // More features grid: stagger scale-in
    if (moreFeaturesSectionRef.value) {
      const moreHeader = moreFeaturesSectionRef.value.querySelector('.lp-section-header')
      if (moreHeader) {
        gsap.set(moreHeader.children, { opacity: 0, y: 40 })
        gsap.to(moreHeader.children, {
          opacity: 1, y: 0,
          duration: 0.9, stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: moreHeader, start: 'top 82%', once: true }
        })
      }

      const moreCards = moreFeaturesSectionRef.value.querySelectorAll('.lp-more-card')
      if (moreCards.length) {
        gsap.set(moreCards, { opacity: 0, y: 50, scale: 0.88, rotateX: 8 })
        gsap.to(moreCards, {
          opacity: 1, y: 0, scale: 1, rotateX: 0,
          duration: 0.7, stagger: 0.06,
          ease: 'back.out(1.2)',
          scrollTrigger: { trigger: moreCards[0], start: 'top 85%', once: true }
        })
      }
    }

    // How it works: sequential step reveal
    if (howSectionRef.value) {
      const howHeader = howSectionRef.value.querySelector('.lp-section-header')
      if (howHeader) {
        gsap.set(howHeader.children, { opacity: 0, y: 40 })
        gsap.to(howHeader.children, {
          opacity: 1, y: 0,
          duration: 0.9, stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: howHeader, start: 'top 82%', once: true }
        })
      }

      const steps = howSectionRef.value.querySelectorAll('.lp-step')
      const arrows = howSectionRef.value.querySelectorAll('.lp-step-arrow')
      if (steps.length) {
        gsap.set(steps, { opacity: 0, y: 50, scale: 0.9 })
        gsap.set(arrows, { opacity: 0, scale: 0.5 })

        const howTl = gsap.timeline({
          scrollTrigger: { trigger: steps[0], start: 'top 82%', once: true }
        })
        steps.forEach((step, i) => {
          howTl.to(step, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)' }, i * 0.2)
          if (arrows[i]) {
            howTl.to(arrows[i], { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }, i * 0.2 + 0.15)
          }
        })
      }
    }

    // CTA final: dramatic reveal
    if (ctaFinalRef.value) {
      const ctaInner = ctaFinalRef.value.querySelector('.lp-cta-inner')
      if (ctaInner) {
        const ctaTitle = ctaInner.querySelector('.lp-cta-title')
        const ctaSub = ctaInner.querySelector('.lp-cta-sub')
        const ctaActions = ctaInner.querySelector('.lp-cta-actions')

        const ctaTl = gsap.timeline({
          scrollTrigger: { trigger: ctaFinalRef.value, start: 'top 78%', once: true }
        })

        if (ctaTitle) {
          gsap.set(ctaTitle, { opacity: 0, y: 50, scale: 0.95 })
          ctaTl.to(ctaTitle, { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'expo.out' })
        }
        if (ctaSub) {
          gsap.set(ctaSub, { opacity: 0, y: 30 })
          ctaTl.to(ctaSub, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
        }
        if (ctaActions) {
          const btns = ctaActions.children
          gsap.set(btns, { opacity: 0, y: 20, scale: 0.9 })
          ctaTl.to(btns, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.4)' }, '-=0.3')
        }
      }
    }
  })

  let demoStep = 0
  demoTicker = setInterval(() => {
    demoStep++
    const avail = demoLots.value.filter(l => l.state === 'available')
    const reserved = demoLots.value.filter(l => l.state === 'reserved')

    if (avail.length > 0) {
      const t = avail[Math.floor(Math.random() * avail.length)]
      const el = demoLotEls.value[t.id - 1]
      if (el) {
        gsap.timeline()
          .to(el, { scale: 1.22, duration: 0.16, ease: 'power3.out' })
          .to(el, { scale: 1, duration: 0.38, ease: 'elastic.out(1.15, 0.35)' })

        if (Math.random() < 0.4 && avail.length > 5) {
          setTimeout(() => {
            t.state = 'reserved'
            const el2 = demoLotEls.value[t.id - 1]
            if (el2) gsap.fromTo(el2,
              { scale: 0.75, opacity: 0.45 },
              { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' }
            )
          }, 340)
        }
      }
    }

    if (reserved.length > 1 && demoStep % 3 === 0) {
      const t = reserved[Math.floor(Math.random() * reserved.length)]
      setTimeout(() => {
        t.state = 'sold'
        const el = demoLotEls.value[t.id - 1]
        if (el) gsap.fromTo(el,
          { scale: 1.3, opacity: 0.65 },
          { scale: 1, opacity: 1, duration: 0.48, ease: 'power2.out' }
        )
      }, 220)
    }

    const soldCount = demoLots.value.filter(l => l.state === 'sold').length
    if (soldCount > 10) {
      demoLots.value.filter(l => l.state === 'sold').slice(0, 4).forEach(l => {
        setTimeout(() => {
          l.state = 'available'
          const el = demoLotEls.value[l.id - 1]
          if (el) gsap.fromTo(el,
            { opacity: 0, scale: 0.5, y: -8 },
            { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' }
          )
        }, Math.random() * 700)
      })
    }
  }, 1200)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', updateViewportState)
  document.body.style.overflow = ''
  if (demoTicker) clearInterval(demoTicker)
})

const onScroll = () => { isScrolled.value = window.scrollY > 30 }

const openWhatsapp = () => {
  if (!settings.value?.contactWhatsapp) return
  const phone = settings.value.contactWhatsapp.replace(/\D/g, '')
  const text = encodeURIComponent('Olá! Vim pela página de demonstração do Lotio e quero saber mais.')
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
}

const submitForm = async () => {
  submitting.value = true
  try {
    await post('/p/settings/contact', {
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone,
      message: `[${form.value.role || 'Cargo não informado'} — ${form.value.company || 'Empresa não informada'}] ${form.value.message || ''}`.trim(),
    })
    submitted.value = true
  } catch (e) {
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

<template>
  <div class="lp-root">
    <LandingHeader />

    <!-- ═══════════════════════════════════════════════════ HERO + FORM -->
    <section class="lp-hero" ref="heroSectionRef">
      <div class="lp-hero-bg"></div>
      <div class="lp-container lp-hero-inner">

        <!-- Left copy -->
        <div class="lp-hero-copy" ref="heroCopyRef">
          <div class="lp-badge">Plataforma para Loteamentos</div>
          <h1 class="lp-hero-h1">
            Seu estande de vendas já está
            <span class="lp-hl">trabalhando.</span><br>
            O digital ainda não.
          </h1>
          <p class="lp-hero-sub">
            O Lotio é a ferramenta de vendas que conecta loteadoras, imobiliárias e corretores num único ecossistema. Mapas interativos, captura automática de leads com contexto e reservas online —tudo em tempo real.
          </p>
          <div class="lp-hero-stats">
            <div class="lp-stat">
              <span class="lp-stat-n">≤ 2min</span>
              <span class="lp-stat-l">para publicar um empreendimento</span>
            </div>
            <div class="lp-stat-divider"></div>
            <div class="lp-stat">
              <span class="lp-stat-n">100%</span>
              <span class="lp-stat-l">rastreamento por corretor</span>
            </div>
            <div class="lp-stat-divider"></div>
            <div class="lp-stat">
              <span class="lp-stat-n">24h</span>
              <span class="lp-stat-l">reservas online abertas</span>
            </div>
          </div>
        </div>

        <!-- Right form card -->
        <div class="lp-form-card" ref="heroFormCardRef">
          <!-- Success state -->
          <div v-if="submitted" class="lp-form-success">
            <div class="lp-success-icon">✓</div>
            <h3>Solicitação enviada!</h3>
            <p>Nossa equipe comercial entrará em contato em até 1 dia útil. Verifique também seu WhatsApp.</p>
            <button v-if="settings?.contactWhatsapp" @click="openWhatsapp" class="lp-btn-wa">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Falar agora no WhatsApp
            </button>
          </div>

          <!-- Form state -->
          <form v-else @submit.prevent="submitForm" class="lp-form">
            <div class="lp-form-header">
              <h2 class="lp-form-title">Solicitar demonstração gratuita</h2>
              <p class="lp-form-sub">Preencha em 30 segundos. Sem compromisso.</p>
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
                <input :value="form.phone" @input="form.phone = applyPhoneMask($event.target.value)" type="tel" placeholder="(11) 99999-9999" required />
              </div>
            </div>
            <div class="lp-field-row">
              <div class="lp-field">
                <label>Empresa / Empreendimento</label>
                <input v-model="form.company" type="text" placeholder="Nome da empresa" />
              </div>
              <div class="lp-field">
                <label>Você é...</label>
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
              <textarea v-model="form.message" placeholder="Ex: Preciso de mapa interativo para meu loteamento de 500 lotes..." rows="3"></textarea>
            </div>

            <button type="submit" class="lp-btn-submit" :disabled="submitting">
              {{ submitting ? 'Enviando...' : 'Quero minha demonstração →' }}
            </button>
            <p class="lp-form-trust"><i class="bi bi-lock-fill" aria-hidden="true"></i> Seus dados estão seguros. Sem spam.</p>
          </form>
        </div>

      </div>
    </section>

    <button
      v-if="isMobileViewport"
      type="button"
      class="lp-fab-cta"
      @click="openMobileForm"
    >
      Solicitar demonstração grátis
    </button>

    <transition name="lp-modal-fade">
      <div
        v-if="isMobileViewport && isMobileFormOpen"
        class="lp-mobile-modal"
        @click.self="closeMobileForm"
      >
        <div class="lp-mobile-modal-card">
          <div class="lp-mobile-modal-header">
            <strong>Solicitar demonstração gratuita</strong>
            <button type="button" class="lp-mobile-close" @click="closeMobileForm">Fechar</button>
          </div>

          <div v-if="submitted" class="lp-form-success">
            <div class="lp-success-icon">✓</div>
            <h3>Solicitação enviada!</h3>
            <p>Nossa equipe comercial entrará em contato em até 1 dia útil. Verifique também seu WhatsApp.</p>
            <button v-if="settings?.contactWhatsapp" @click="openWhatsapp" class="lp-btn-wa">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Falar agora no WhatsApp
            </button>
          </div>

          <form v-else @submit.prevent="submitForm" class="lp-form lp-form--modal">
            <div class="lp-form-header">
              <h2 class="lp-form-title">Solicitar demonstração gratuita</h2>
              <p class="lp-form-sub">Preencha em 30 segundos. Sem compromisso.</p>
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
              <input :value="form.phone" @input="form.phone = applyPhoneMask($event.target.value)" type="tel" placeholder="(11) 99999-9999" required />
            </div>
            <div class="lp-field">
              <label>Empresa / Empreendimento</label>
              <input v-model="form.company" type="text" placeholder="Nome da empresa" />
            </div>
            <div class="lp-field">
              <label>Você é...</label>
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
              <textarea v-model="form.message" placeholder="Ex: Preciso de mapa interativo para meu loteamento de 500 lotes..." rows="3"></textarea>
            </div>

            <button type="submit" class="lp-btn-submit" :disabled="submitting">
              {{ submitting ? 'Enviando...' : 'Quero minha demonstração ->' }}
            </button>
            <p class="lp-form-trust"><i class="bi bi-lock-fill" aria-hidden="true"></i> Seus dados estão seguros. Sem spam.</p>
          </form>
        </div>
      </div>
    </transition>

    <!-- ═══════════════════════════════════════════════════ LOGOS / SOCIAL PROOF STRIP -->
    <div class="lp-trust-strip" ref="trustStripRef">
      <div class="lp-container">
        <span class="lp-trust-label">Desenvolvido para:</span>
        <div class="lp-trust-logos">
          <div class="lp-trust-badge"><i class="bi bi-building-gear" aria-hidden="true"></i> Loteadoras</div>
          <div class="lp-trust-sep">·</div>
          <div class="lp-trust-badge"><i class="bi bi-building" aria-hidden="true"></i> Incorporadoras</div>
          <div class="lp-trust-sep">·</div>
          <div class="lp-trust-badge"><i class="bi bi-house-door-fill" aria-hidden="true"></i> Imobiliárias</div>
          <div class="lp-trust-sep">·</div>
          <div class="lp-trust-badge"><i class="bi bi-people-fill" aria-hidden="true"></i> Corretores Autônomos</div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ PERSONAS -->
    <section class="lp-personas">
      <div class="lp-container">
        <div class="lp-section-header" style="margin-bottom:40px">
          <div class="lp-badge-green">Uma plataforma, três vencedores</div>
          <h2 class="lp-section-title">O Lotio foi projetado para <br><span class="lp-hl">cada elo da cadeia de vendas.</span></h2>
        </div>
        <div class="lp-personas-grid">
          <div class="lp-persona-card lp-persona-card--primary">
            <div class="lp-persona-icon"><i class="bi bi-building-gear" aria-hidden="true"></i></div>
            <h3>Loteadora</h3>
            <p class="lp-persona-role">Dona do empreendimento</p>
            <ul class="lp-persona-list">
              <li>Mapa interativo publicado em minutos, sem TI</li>
              <li>Controle total de estoque com atualização em tempo real</li>
              <li>Painel unificado de leads, reservas e performance por corretor</li>
              <li>Relatórios de conversão por canal e período</li>
              <li>Stand de vendas digital disponível 24h por dia</li>
            </ul>
          </div>
          <div class="lp-persona-card">
            <div class="lp-persona-icon"><i class="bi bi-building" aria-hidden="true"></i></div>
            <h3>Imobiliária</h3>
            <p class="lp-persona-role">Parceira comercial</p>
            <ul class="lp-persona-list">
              <li>Acesso ao painel do empreendimento vinculado à sua conta</li>
              <li>Gerencie sua equipe de corretores com visibilidade total</li>
              <li>Links exclusivos por corretor para rastrear origem dos leads</li>
              <li>Histórico completo de cada negociação no painel</li>
              <li>Distribua empreendimentos entre seus corretores facilmente</li>
            </ul>
          </div>
          <div class="lp-persona-card">
            <div class="lp-persona-icon"><i class="bi bi-people-fill" aria-hidden="true"></i></div>
            <h3>Corretor</h3>
            <p class="lp-persona-role">Força de vendas</p>
            <ul class="lp-persona-list">
              <li>Link rastreado exclusivo para cada empreendimento</li>
              <li>Receba notificações no WhatsApp quando um lead chegar pelo seu link</li>
              <li>Veja seu ranking de performance em tempo real</li>
              <li>Compartilhe o mapa do loteamento via WhatsApp, Instagram ou e-mail</li>
              <li>Leads chegam com o lote e a quadra de interesse já identificados</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════ DOR / PROBLEMA -->
    <section class="lp-pain" ref="painSectionRef">
      <div class="lp-container">
        <div class="lp-section-header">
          <div class="lp-badge-dark">A realidade do setor</div>
          <h2 class="lp-section-title">Quantas vendas você está<br><span class="lp-hl">perdendo agora mesmo?</span></h2>
          <p class="lp-section-sub">
            O setor de loteamentos ainda opera com ferramentas da década passada. O resultado: leads frios, corretores sem dados e clientes frustrados.
          </p>
        </div>

        <div class="lp-pain-grid">
          <div class="lp-pain-card">
            <div class="lp-pain-icon"><i class="bi bi-file-earmark-text-fill" aria-hidden="true"></i></div>
            <h3>PDF estático na landing page</h3>
            <p>O cliente não sabe quais lotes estão disponíveis. Liga pro corretor. Não é atendido. <strong>Desiste.</strong></p>
          </div>
          <div class="lp-pain-card">
            <div class="lp-pain-icon"><i class="bi bi-phone" aria-hidden="true"></i></div>
            <h3>Lead sem contexto no WhatsApp</h3>
            <p>O interessado manda mensagem genérica. O corretor não sabe qual lote, qual quadra, qual projeto. <strong>Follow-up fraco.</strong></p>
          </div>
          <div class="lp-pain-card">
            <div class="lp-pain-icon"><i class="bi bi-bar-chart-line-fill" aria-hidden="true"></i></div>
            <h3>Planilha de estoque desatualizada</h3>
            <p>Dois corretores reservam o mesmo lote. Cliente constrangido. Empresa sem credibilidade. <strong>Venda perdida.</strong></p>
          </div>
          <div class="lp-pain-card">
            <div class="lp-pain-icon"><i class="bi bi-clock-fill" aria-hidden="true"></i></div>
            <h3>Depende de terceiros para atualizar</h3>
            <p>Mudou um preço ou status? Aguarda o designer, TI ou a agência. <strong>3 dias para uma linha no mapa.</strong></p>
          </div>
          <div class="lp-pain-card">
            <div class="lp-pain-icon"><i class="bi bi-question-circle-fill" aria-hidden="true"></i></div>
            <h3>Nenhum rastreamento de performance</h3>
            <p>Qual corretor está gerando mais? Qual canal aqueceu mais leads? <strong>Zero visibilidade.</strong></p>
          </div>
          <div class="lp-pain-card">
            <div class="lp-pain-icon"><i class="bi bi-moon-stars-fill" aria-hidden="true"></i></div>
            <h3>Stand de vendas fecha às 18h</h3>
            <p>O cliente pesquisa à noite. Seu stand está fechado. <strong>A concorrência está disponível 24h.</strong></p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════ SOLUÇÃO / FEATURES -->
    <section id="features" class="lp-features" ref="featuresSectionRef">
      <div class="lp-container">
        <div class="lp-section-header">
          <div class="lp-badge-green">A plataforma completa</div>
          <h2 class="lp-section-title">Cada ferramenta pensada para<br><span class="lp-hl">o seu time comercial vender mais.</span></h2>
        </div>

        <!-- Feature block 1 — Mapa interativo -->
        <div class="lp-feat-block">
          <div class="lp-feat-copy">
            <div class="lp-feat-tag">Para o time de vendas</div>
            <h3 class="lp-feat-title">Mapa interativo que fecha vendas</h3>
            <p class="lp-feat-desc">
              Transforme uma imagem estática em uma ferramenta de vendas ativa. Cada lote é clicável: disponível, reservado ou vendido — em tempo real, sem recarregar página.
            </p>
            <ul class="lp-feat-list">
              <li><span class="lp-check">✓</span> Cliente vê exatamente o que está disponível, sem ligar</li>
              <li><span class="lp-check">✓</span> Status atualizado automaticamente a cada reserva</li>
              <li><span class="lp-check">✓</span> Funciona no celular, desktop e totem de stands</li>
              <li><span class="lp-check">✓</span> Filtros por metragem, quadra e preço</li>
            </ul>
          </div>
          <div class="lp-feat-visual lp-feat-visual--map">
            <div class="lp-mock-map">
              <div class="lp-mock-map-grid">
                <div
                  v-for="lot in demoLots"
                  :key="lot.id"
                  :ref="el => { if(el) demoLotEls[lot.id - 1] = el }"
                  class="lp-lot"
                  :class="{ 'lp-lot--sold': lot.state === 'sold', 'lp-lot--reserved': lot.state === 'reserved' }"
                  style="will-change: transform;"
                >
                  <span class="lp-lot-n">{{ lot.id }}</span>
                </div>
              </div>
              <div class="lp-mock-legend">
                <span class="lp-leg lp-leg--green">Disponível</span>
                <span class="lp-leg lp-leg--yellow">Reservado</span>
                <span class="lp-leg lp-leg--red">Vendido</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature block 2 — Lead capture -->
        <div class="lp-feat-block lp-feat-block--rev">
          <div class="lp-feat-copy">
            <div class="lp-feat-tag">Para o time de marketing</div>
            <h3 class="lp-feat-title">Leads qualificados no WhatsApp, com contexto</h3>
            <p class="lp-feat-desc">
              Quando o cliente clica em um lote, ele informa o interesse. O sistema envia uma notificação para o corretor responsável com o lote exato, a quadra e o contato: nada de perguntar "qual lote você tinha visto?".
            </p>
            <ul class="lp-feat-list">
              <li><span class="lp-check">✓</span> Notificação automática por e-mail ou WhatsApp</li>
              <li><span class="lp-check">✓</span> Lead vinculado ao lote de interesse</li>
              <li><span class="lp-check">✓</span> Painel de leads em tempo real no backoffice</li>
              <li><span class="lp-check">✓</span> Histórico completo de interações por lead</li>
            </ul>
          </div>
          <div class="lp-feat-visual lp-feat-visual--lead">
            <div class="lp-mock-notification">
              <div class="lp-notif-header">
                <div class="lp-notif-icon"><i class="bi bi-phone" aria-hidden="true"></i></div>
                <div>
                  <div class="lp-notif-from">Lotio — Novo Lead</div>
                  <div class="lp-notif-time">agora</div>
                </div>
              </div>
              <div class="lp-notif-body">
                <strong>Ana Souza</strong> demonstrou interesse no<br>
                <span class="lp-notif-hl">Lote 07 · Quadra C · 250m²</span><br>
                <span class="lp-notif-phone"><i class="bi bi-telephone-fill" aria-hidden="true"></i> (11) 98765-4321</span>
              </div>
              <div class="lp-notif-actions">
                <span class="lp-notif-btn">Ver no painel →</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature block 3 — Corretor links -->
        <div class="lp-feat-block">
          <div class="lp-feat-copy">
            <div class="lp-feat-tag">Para o gestor comercial</div>
            <h3 class="lp-feat-title">Links rastreados por corretor</h3>
            <p class="lp-feat-desc">
              Cada corretor recebe um link exclusivo para compartilhar com seus clientes. O sistema registra cada acesso, lead e reserva gerada por aquele link — sem precisar confiar na palavra de ninguém.
            </p>
            <ul class="lp-feat-list">
              <li><span class="lp-check">✓</span> Ranking de performance da equipe</li>
              <li><span class="lp-check">✓</span> Atribuição automática de comissão por origem</li>
              <li><span class="lp-check">✓</span> Acesso controlado por corretor ou imobiliária</li>
              <li><span class="lp-check">✓</span> Relatórios de conversão por período</li>
            </ul>
          </div>
          <div class="lp-feat-visual lp-feat-visual--rank">
            <div class="lp-mock-rank">
              <div class="lp-rank-title">Performance da semana</div>
              <div class="lp-rank-item" v-for="(rep, i) in [{n:'Carlos Lima', v:12, p:95},{n:'Juliana Mota', v:9, p:72},{n:'Pedro Alves', v:7, p:56},{n:'Carla Duque', v:4, p:30}]" :key="i">
                <div class="lp-rank-pos">{{ i + 1 }}</div>
                <div class="lp-rank-info">
                  <span class="lp-rank-name">{{ rep.n }}</span>
                  <div class="lp-rank-bar"><div class="lp-rank-fill" :style="`width:${rep.p}%`"></div></div>
                </div>
                <div class="lp-rank-val">{{ rep.v }} leads</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature block 4 — Reserva online -->
        <div class="lp-feat-block lp-feat-block--rev">
          <div class="lp-feat-copy">
            <div class="lp-feat-tag">Para o financeiro</div>
            <h3 class="lp-feat-title">Reserva online com cobrança via gateway</h3>
            <p class="lp-feat-desc">
              Conecte seu gateway de pagamento (Asaas, Mercado Pago, Pagar.me ou PagSeguro) e habilite a cobrança do sinal diretamente na plataforma, via PIX ou Cartão de Crédito — sem intermediários manuais.
            </p>
            <ul class="lp-feat-list">
              <li><span class="lp-check">✓</span> PIX e Cartão após configuração do gateway</li>
              <li><span class="lp-check">✓</span> Lote bloqueado imediatamente após pagamento confirmado</li>
              <li><span class="lp-check">✓</span> Webhook automático para seu sistema financeiro</li>
              <li><span class="lp-check">✓</span> Painel com status de cada reserva em tempo real</li>
            </ul>
          </div>
          <div class="lp-feat-visual lp-feat-visual--pay">
            <div class="lp-mock-payment">
              <div class="lp-pay-title">Reservar · Lote 07</div>
              <div class="lp-pay-price">R$ 1.500,00</div>
              <div class="lp-pay-sub">Sinal de reserva</div>
              <div class="lp-pay-methods">
                <div class="lp-pay-m lp-pay-m--active">PIX</div>
                <div class="lp-pay-m">Cartão</div>
              </div>
              <div class="lp-pay-pix">
                <div class="lp-pix-qr">
                  <div v-for="r in 5" :key="r" class="lp-pix-row">
                    <div v-for="c in 5" :key="c" class="lp-pix-cell" :class="{'lp-pix-on': (r+c)%2===0}"></div>
                  </div>
                </div>
                <span class="lp-pix-label">QR Code gerado em tempo real</span>
              </div>
              <div class="lp-pay-btn">Confirmar Reserva</div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════ MAIS FEATURES (GRID) -->
    <section class="lp-more-features" ref="moreFeaturesSectionRef">
      <div class="lp-container">
        <div class="lp-section-header">
          <h2 class="lp-section-title">Tudo em uma plataforma.<br><span class="lp-hl">Sem papelada extra.</span></h2>
        </div>
        <div class="lp-more-grid">
          <div class="lp-more-card">
            <div class="lp-more-icon"><i class="bi bi-pen-fill" aria-hidden="true"></i></div>
            <h4>Editor Canvas próprio</h4>
            <p>Publique alterações de preço, status e layout do mapa sem depender de designer ou TI.</p>
          </div>
          <div class="lp-more-card">
            <div class="lp-more-icon"><i class="bi bi-camera-fill" aria-hidden="true"></i></div>
            <h4>Galeria de fotos e vídeos</h4>
            <p>Incorpore fotos do empreendimento, render 3D e vídeo diretamente na página do projeto.</p>
          </div>
          <div class="lp-more-card">
            <div class="lp-more-icon"><i class="bi bi-map" aria-hidden="true"></i></div>
            <h4>Panorama 360°</h4>
            <p>Permita que o cliente visite o empreendimento virtualmente antes de colocar o pé lá.</p>
          </div>
          <div class="lp-more-card">
            <div class="lp-more-icon"><i class="bi bi-display-fill" aria-hidden="true"></i></div>
            <h4>Totem para stand</h4>
            <p>URL otimizada para totens touch-screen no estande de vendas, sem instalar nada.</p>
          </div>
          <div class="lp-more-card">
            <div class="lp-more-icon"><i class="bi bi-box-seam-fill" aria-hidden="true"></i></div>
            <h4>Multi-empreendimentos</h4>
            <p>Gerencie todo o seu portfólio em uma conta única, com controle total de acesso por projeto.</p>
          </div>
          <div class="lp-more-card">
            <div class="lp-more-icon"><i class="bi bi-graph-up-arrow" aria-hidden="true"></i></div>
            <h4>Analytics em tempo real</h4>
            <p>Visualize acessos, cliques e taxas de conversão diretamente no painel, sem plugins externos.</p>
          </div>
          <div class="lp-more-card">
            <div class="lp-more-icon"><i class="bi bi-robot" aria-hidden="true"></i></div>
            <h4>Assistente IA integrado</h4>
            <p>Um chatbot imobiliário responde dúvidas do cliente de forma automática, 24h por dia.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════ COMO FUNCIONA -->
    <section class="lp-how" ref="howSectionRef">
      <div class="lp-container">
        <div class="lp-section-header">
          <div class="lp-badge-green">Simples por design</div>
          <h2 class="lp-section-title">Do cadastro à primeira venda<br><span class="lp-hl">em menos de um dia.</span></h2>
        </div>
        <div class="lp-how-steps">
          <div class="lp-step">
            <div class="lp-step-num">01</div>
            <div class="lp-step-body">
              <h4>Cadastre seu empreendimento</h4>
              <p>Informe nome, localização e faça o upload do mapa do loteamento. O sistema detecta automaticamente o layout.</p>
            </div>
          </div>
          <div class="lp-step-arrow">→</div>
          <div class="lp-step">
            <div class="lp-step-num">02</div>
            <div class="lp-step-body">
              <h4>Configure seus lotes no editor</h4>
              <p>Use o editor canvas para definir as áreas de cada lote, status e preço. Sem código, sem reunião com TI.</p>
            </div>
          </div>
          <div class="lp-step-arrow">→</div>
          <div class="lp-step">
            <div class="lp-step-num">03</div>
            <div class="lp-step-body">
              <h4>Publique e compartilhe</h4>
              <p>Copie o link do empreendimento. Distribua para corretores, coloque no Instagram, site e totem de vendas.</p>
            </div>
          </div>
          <div class="lp-step-arrow">→</div>
          <div class="lp-step">
            <div class="lp-step-num">04</div>
            <div class="lp-step-body">
              <h4>Receba leads e reservas</h4>
              <p>A plataforma opera 24h. Receba notificações em tempo real e acompanhe tudo no painel administrativo.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════ CTA FINAL -->
    <section class="lp-cta-final" ref="ctaFinalRef">
      <div class="lp-container">
        <div class="lp-cta-inner">
          <h2 class="lp-cta-title">Pronto para transformar seus loteamentos em máquinas de venda?</h2>
          <p class="lp-cta-sub">Solicitação gratuita. Demonstração guiada com especialista em menos de 24h.</p>
          <div class="lp-cta-actions">
            <a href="#form-top" class="lp-cta-btn-primary" @click.prevent="scrollToForm">
              Solicitar demonstração grátis
            </a>
            <a v-if="settings?.contactWhatsapp" @click.prevent="openWhatsapp" href="#" class="lp-cta-btn-wa">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chamar no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>

    <LandingFooter />
  </div>
</template>

<style scoped>
/* ──────────── Root & Container ──────────── */
.lp-root {
  font-family: var(--font-sans);
  color: var(--gray-900);
  background: var(--gray-50);
  overflow-x: hidden;
}
.lp-container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 20px;
}
@media (min-width: 768px) {
  .lp-container { padding: 0 32px; }
}

/* ──────────── Animations (handled by GSAP) ──────────── */

/* ──────────── Highlight ──────────── */
.lp-hl {
  color: var(--primary);
  position: relative;
}

/* ──────────── Badges ──────────── */
.lp-badge {
  display: inline-block;
  padding: 5px 14px;
  background: var(--primary-50);
  color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 18px;
}
.lp-badge-dark {
  display: inline-block;
  padding: 5px 14px;
  background: var(--gray-900);
  color: #fff;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 18px;
}
.lp-badge-green {
  display: inline-block;
  padding: 5px 14px;
  background: var(--primary-50);
  color: var(--primary);
  border: 1px solid rgba(16,185,129,0.3);
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 18px;
}

/* ──────────── Section header ──────────── */
.lp-section-header {
  text-align: center;
  max-width: 720px;
  margin: 0 auto 56px;
}
.lp-section-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin-bottom: 16px;
  color: var(--gray-900);
}
@media (min-width: 768px) {
  .lp-section-title { font-size: 2.75rem; }
}
.lp-section-sub {
  font-size: 1.05rem;
  color: var(--gray-500);
  line-height: 1.6;
}

/* ──────────── HERO ──────────── */
.lp-hero {
  position: relative;
  padding: 100px 0 60px;
  background: var(--gray-50);
  overflow: hidden;
}
.lp-hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 60% -10%, rgba(16,185,129,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.lp-hero-inner {
  display: flex;
  flex-direction: column;
  gap: 48px;
  align-items: flex-start;
}
@media (min-width: 1024px) {
  .lp-hero-inner {
    flex-direction: row;
    align-items: center;
    gap: 64px;
  }
}

.lp-hero-copy {
  flex: 1;
}
.lp-hero-h1 {
  font-size: 2.25rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--gray-900);
  margin-bottom: 20px;
}
@media (min-width: 768px) {
  .lp-hero-h1 { font-size: 3.25rem; }
}
.lp-hero-sub {
  font-size: 1.075rem;
  color: var(--gray-500);
  line-height: 1.65;
  margin-bottom: 36px;
  max-width: 540px;
}
.lp-hero-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
@media (min-width: 640px) {
  .lp-hero-stats { flex-direction: row; align-items: center; gap: 24px; }
}
.lp-stat { display: flex; flex-direction: column; gap: 2px; }
.lp-stat-n {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--primary);
  letter-spacing: -0.03em;
}
.lp-stat-l { font-size: 0.8rem; color: var(--gray-500); font-weight: 500; }
.lp-stat-divider { width: 1px; height: 40px; background: var(--gray-200); display: none; }
@media (min-width: 640px) {
  .lp-stat-divider {
    display: block;
  }
  .lp-form-card {
    flex: 0 0 440px;
  }
}

/* Form Card */
.lp-form-card {
  max-width: 100%;
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 20px;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  width: 100%;
}
.lp-form {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.lp-form-header { margin-bottom: 4px; }
.lp-form-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--gray-900);
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}
.lp-form-sub { font-size: 0.85rem; color: var(--gray-400); }

.lp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lp-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--gray-600);
  letter-spacing: 0.01em;
}
.lp-field input,
.lp-field select,
.lp-field textarea {
  padding: 10px 14px;
  border: 1.5px solid var(--gray-200);
  border-radius: 10px;
  font-size: 0.9rem;
  color: var(--gray-900);
  background: var(--gray-50);
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: var(--font-sans);
  outline: none;
  width: 100%;
}
.lp-field input:focus,
.lp-field select:focus,
.lp-field textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
  background: #fff;
}
.lp-field textarea { resize: vertical; min-height: 80px; }

.lp-field-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 480px) {
  .lp-field-row { grid-template-columns: 1fr 1fr; }
}

.lp-btn-submit {
  margin-top: 4px;
  padding: 14px 24px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  width: 100%;
}
.lp-btn-submit:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}
.lp-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.lp-form-trust {
  text-align: center;
  font-size: 0.78rem;
  color: var(--gray-400);
  margin-top: -4px;
}

/* Form success */
.lp-form-success {
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}
.lp-success-icon {
  width: 60px;
  height: 60px;
  background: var(--primary-50);
  color: var(--primary);
  border-radius: 50%;
  font-size: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lp-form-success h3 {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--gray-900);
}
.lp-form-success p { color: var(--gray-500); font-size: 0.95rem; line-height: 1.6; }
.lp-btn-wa {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: #25D366;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}
.lp-btn-wa:hover { background: #1ebe5d; }

/* ──────────── Trust strip ──────────── */
.lp-trust-strip {
  background: #fff;
  border-top: 1px solid var(--gray-100);
  border-bottom: 1px solid var(--gray-100);
  padding: 20px 0;
}
.lp-trust-strip .lp-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
@media (min-width: 640px) {
  .lp-trust-strip .lp-container { flex-direction: row; justify-content: center; }
}
.lp-trust-label { font-size: 0.8rem; color: var(--gray-400); font-weight: 500; white-space: nowrap; }
.lp-trust-logos { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: center; }
.lp-trust-badge {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--gray-700);
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  padding: 5px 14px;
  border-radius: 999px;
}
.lp-trust-sep { color: var(--gray-300); font-size: 1.2rem; }

/* ──────────── Pain section ──────────── */
.lp-pain {
  padding: 80px 0;
  background: var(--gray-900);
  color: #fff;
}
.lp-pain .lp-section-title { color: #fff; }
.lp-pain .lp-section-sub { color: rgba(255,255,255,0.6); }
.lp-pain-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 640px) { .lp-pain-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .lp-pain-grid { grid-template-columns: repeat(3, 1fr); } }

.lp-pain-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 28px;
  transition: background 0.2s;
}
.lp-pain-card:hover { background: rgba(255,255,255,0.08); }
.lp-pain-icon { font-size: 2rem; margin-bottom: 12px; }
.lp-pain-card h3 { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 10px; }
.lp-pain-card p { font-size: 0.875rem; color: rgba(255,255,255,0.55); line-height: 1.6; }
.lp-pain-card strong { color: rgba(255,255,255,0.85); }

/* ──────────── Features ──────────── */
.lp-features {
  padding: 80px 0;
  background: #fff;
}
@media (min-width: 768px) { .lp-features { padding: 120px 0; } }

.lp-feat-block {
  display: flex;
  flex-direction: column;
  gap: 48px;
  align-items: center;
  margin-bottom: 80px;
}
@media (min-width: 900px) {
  .lp-feat-block {
    flex-direction: row;
    gap: 64px;
  }
  .lp-feat-block--rev { flex-direction: row-reverse; }
}

.lp-feat-copy { flex: 1; }
.lp-feat-tag {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
  margin-bottom: 10px;
}
.lp-feat-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: var(--gray-900);
  margin-bottom: 14px;
}
@media (min-width: 768px) { .lp-feat-title { font-size: 2.1rem; } }
.lp-feat-desc {
  font-size: 1rem;
  color: var(--gray-500);
  line-height: 1.65;
  margin-bottom: 22px;
}
.lp-feat-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.lp-feat-list li { font-size: 0.9rem; color: var(--gray-600); display: flex; align-items: flex-start; gap: 8px; }
.lp-check { color: var(--primary); font-weight: 900; flex-shrink: 0; margin-top: 1px; }

.lp-feat-visual {
  flex: 0 0 auto;
  width: 100%;
  max-width: 440px;
}

/* Mock map */
.lp-mock-map {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: 16px;
  padding: 24px;
}
.lp-mock-map-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 16px;
}
.lp-lot {
  aspect-ratio: 1;
  border-radius: 6px;
  background: rgba(16,185,129,0.15);
  border: 1.5px solid rgba(16,185,129,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
  position: relative;
}
.lp-lot:hover { transform: scale(1.06); }
.lp-lot--sold { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); }
.lp-lot--reserved { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.35); }

.lp-lot-n { font-size: 0.6rem; font-weight: 700; color: var(--gray-600); }
.lp-mock-legend { display: flex; gap: 16px; flex-wrap: wrap; }
.lp-leg { font-size: 0.72rem; font-weight: 600; display: flex; align-items: center; gap: 5px; }
.lp-leg::before { content: ''; width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.lp-leg--green::before { background: rgba(16,185,129,0.4); border: 1.5px solid rgba(16,185,129,0.5); }
.lp-leg--yellow::before { background: rgba(245,158,11,0.4); border: 1.5px solid rgba(245,158,11,0.5); }
.lp-leg--red::before { background: rgba(239,68,68,0.4); border: 1.5px solid rgba(239,68,68,0.5); }

/* Mock notification */
.lp-mock-notification {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-lg);
  max-width: 340px;
  margin: 0 auto;
}
.lp-notif-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.lp-notif-icon { font-size: 1.5rem; }
.lp-notif-from { font-weight: 700; font-size: 0.85rem; color: var(--gray-900); }
.lp-notif-time { font-size: 0.72rem; color: var(--gray-400); }
.lp-notif-body { font-size: 0.875rem; color: var(--gray-600); line-height: 1.7; margin-bottom: 16px; }
.lp-notif-hl { background: var(--primary-50); color: var(--primary); padding: 1px 6px; border-radius: 4px; font-weight: 700; }
.lp-notif-phone { color: var(--gray-500); }
.lp-notif-actions { border-top: 1px solid var(--gray-100); padding-top: 12px; }
.lp-notif-btn { font-size: 0.8rem; color: var(--primary); font-weight: 700; }

/* Mock rank */
.lp-mock-rank {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-lg);
}
.lp-rank-title { font-size: 0.8rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
.lp-rank-item { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.lp-rank-pos { width: 24px; height: 24px; border-radius: 50%; background: var(--primary-50); color: var(--primary); font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lp-rank-info { flex: 1; }
.lp-rank-name { font-size: 0.85rem; font-weight: 600; color: var(--gray-800); display: block; margin-bottom: 4px; }
.lp-rank-bar { height: 6px; background: var(--gray-100); border-radius: 99px; overflow: hidden; }
.lp-rank-fill { height: 100%; background: var(--primary); border-radius: 99px; }
.lp-rank-val { font-size: 0.78rem; font-weight: 700; color: var(--primary); white-space: nowrap; }

/* Mock payment */
.lp-mock-payment {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 16px;
  padding: 28px;
  box-shadow: var(--shadow-lg);
  max-width: 320px;
  margin: 0 auto;
}
.lp-pay-title { font-size: 0.85rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
.lp-pay-price { font-size: 2rem; font-weight: 900; color: var(--gray-900); letter-spacing: -0.04em; }
.lp-pay-sub { font-size: 0.8rem; color: var(--gray-400); margin-bottom: 18px; }
.lp-pay-methods { display: flex; gap: 10px; margin-bottom: 20px; }
.lp-pay-m {
  padding: 6px 20px;
  border-radius: 8px;
  border: 1.5px solid var(--gray-200);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--gray-500);
  cursor: pointer;
}
.lp-pay-m--active { border-color: var(--primary); color: var(--primary); background: var(--primary-50); }
.lp-pay-pix { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 18px; }
.lp-pix-qr { display: grid; grid-template-rows: repeat(5,1fr); gap: 3px; width: 70px; height: 70px; }
.lp-pix-row { display: grid; grid-template-columns: repeat(5,1fr); gap: 3px; }
.lp-pix-cell { border-radius: 2px; background: var(--gray-200); }
.lp-pix-on { background: var(--gray-900) !important; }
.lp-pix-label { font-size: 0.72rem; color: var(--gray-400); }
.lp-pay-btn {
  background: var(--primary);
  color: #fff;
  border-radius: 10px;
  padding: 11px;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
}

/* ──────────── More features ──────────── */
.lp-more-features {
  padding: 80px 0;
  background: var(--gray-50);
}
.lp-more-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (min-width: 768px) { .lp-more-grid { grid-template-columns: repeat(4, 1fr); } }
.lp-more-card {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 14px;
  padding: 24px 20px;
  transition: box-shadow 0.2s, transform 0.2s;
}
.lp-more-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.lp-more-icon { font-size: 1.6rem; margin-bottom: 10px; }
.lp-more-card h4 { font-size: 0.9rem; font-weight: 700; color: var(--gray-900); margin-bottom: 8px; }
.lp-more-card p { font-size: 0.8rem; color: var(--gray-500); line-height: 1.6; }

/* ──────────── How it works ──────────── */
.lp-how {
  padding: 80px 0;
  background: #fff;
}
.lp-how-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: flex-start;
}
@media (min-width: 900px) {
  .lp-how-steps {
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
  }
}
.lp-step {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: 16px;
  padding: 28px 24px;
  flex: 1;
  min-width: 0;
}
.lp-step-num {
  font-size: 2rem;
  font-weight: 900;
  color: var(--primary);
  line-height: 1;
  margin-bottom: 12px;
  font-variant-numeric: tabular-nums;
}
.lp-step-body h4 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: var(--gray-900); }
.lp-step-body p { font-size: 0.875rem; color: var(--gray-500); line-height: 1.6; }
.lp-step-arrow {
  font-size: 1.5rem;
  color: var(--gray-300);
  display: none;
  padding-top: 32px;
  flex-shrink: 0;
}
@media (min-width: 900px) { .lp-step-arrow { display: block; } }

/* ──────────── CTA final ──────────── */
.lp-cta-final {
  padding: 100px 0;
  background: linear-gradient(135deg, var(--gray-900) 0%, #0d2a1f 100%);
  overflow: hidden;
  position: relative;
}
.lp-cta-final::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%);
  pointer-events: none;
}
.lp-cta-inner {
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
}
.lp-cta-title {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.15;
  color: #fff;
  margin-bottom: 16px;
}
@media (min-width: 768px) { .lp-cta-title { font-size: 2.8rem; } }
.lp-cta-sub { font-size: 1.05rem; color: rgba(255,255,255,0.6); margin-bottom: 40px; }
.lp-cta-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
}
@media (min-width: 500px) { .lp-cta-actions { flex-direction: row; justify-content: center; } }
.lp-cta-btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  background: var(--primary);
  color: #fff;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  transition: background 0.2s, transform 0.15s;
  cursor: pointer;
}
.lp-cta-btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
.lp-cta-btn-wa {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.16);
  color: #fff;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  transition: background 0.2s;
  cursor: pointer;
}
.lp-cta-btn-wa:hover { background: rgba(255,255,255,0.14); }

/* ──────────── PERSONAS ──────────── */
.lp-personas {
  padding: 80px 0;
  background: white;
}
.lp-personas-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 768px) {
  .lp-personas-grid { grid-template-columns: repeat(3, 1fr); }
}
.lp-persona-card {
  background: var(--gray-50);
  border: 1.5px solid var(--gray-100);
  border-radius: 20px;
  padding: 32px 28px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.lp-persona-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(0,0,0,0.07);
}
.lp-persona-card--primary {
  border-color: rgba(16,185,129,0.3);
  background: linear-gradient(160deg, rgba(16,185,129,0.04) 0%, white 100%);
}
.lp-persona-icon { font-size: 2rem; margin-bottom: 12px; }
.lp-persona-card h3 {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--gray-900);
  margin: 0 0 2px;
}
.lp-persona-role {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 20px;
}
.lp-persona-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 10px;
}
.lp-persona-list li {
  font-size: 0.9rem;
  color: var(--gray-600);
  line-height: 1.4;
  padding-left: 20px;
  position: relative;
}
.lp-persona-list li::before {
  content: '✓';
  position: absolute; left: 0;
  color: var(--primary);
  font-weight: 700;
  font-size: 0.8rem;
}

/* ──────────── Mobile Modal CTA ──────────── */
.lp-fab-cta {
  position: fixed;
  right: 16px;
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 1000;
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  box-shadow: 0 16px 34px rgba(16,185,129,0.35);
}

.lp-mobile-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(17, 24, 39, 0.6);
  display: flex;
  align-items: flex-end;
  padding: 10px;
}

.lp-mobile-modal-card {
  width: 100%;
  max-height: 92vh;
  overflow: auto;
  border-radius: 18px;
  border: 1px solid var(--gray-200);
  background: #fff;
}

.lp-mobile-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--gray-100);
  color: var(--gray-900);
}

.lp-mobile-close {
  border: 0;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: var(--gray-100);
  color: var(--gray-700);
  font-size: 1rem;
  font-weight: 700;
}

.lp-form--modal {
  padding: 20px 16px 24px;
}

.lp-modal-fade-enter-active,
.lp-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.lp-modal-fade-enter-from,
.lp-modal-fade-leave-to {
  opacity: 0;
}

@media (min-width: 768px) {
  .lp-fab-cta,
  .lp-mobile-modal {
    display: none;
  }
}

@media (max-width: 767px) {
  .lp-form-card {
    display: none;
  }
}
</style>
