<template>
  <section class="hero">
    <div class="hero-overlay"></div>
    <div class="container-landing">
      <div class="hero-content" ref="heroContentRef">
        <h1 class="hero-title" ref="heroTitleRef">
          O futuro do loteamento é <span class="text-primary">interativo</span>.
        </h1>
        <p class="hero-subtitle" ref="heroSubRef">
          Transforme mapas estáticos em ferramentas de venda imersivas. 
          Gestão de estoque, captura de leads e automação para corretores em uma única plataforma.
        </p>
        <div class="hero-actions" ref="heroActionsRef">
          <button v-if="settings?.contactWhatsapp" @click="openWhatsapp" class="btn btn-primary btn-apple-lg btn-shadow">
            Falar com especialista
          </button>
          <button v-else @click="showContactForm = true" class="btn btn-primary btn-apple-lg btn-shadow">
            Começar agora
          </button>
          <a href="#features" class="btn btn-secondary btn-apple-lg btn-ghost">
            Saiba mais <i class="pi pi-chevron-right ml-2 text-xs"></i>
          </a>
        </div>
      </div>
    </div>

    <!-- Contact Form Modal -->
    <div v-if="showContactForm" class="modal-overlay">
      <div class="modal-content animate-scale-in">
        <button class="modal-close" @click="showContactForm = false">&times;</button>
        <h2 class="modal-title">Solicite uma Demonstração</h2>
        <p class="modal-subtitle">Preencha os campos abaixo e entraremos em contato o mais breve possível.</p>
        
        <form @submit.prevent="submitContact" class="contact-form">
          <div class="form-group">
            <label>Qual seu nome?</label>
            <input v-model="form.name" type="text" placeholder="Seu nome completo" required>
          </div>
          <div class="form-group">
            <label>E-mail corporativo</label>
            <input v-model="form.email" type="email" placeholder="seu@email.com" required>
          </div>
          <div class="form-group">
            <label>WhatsApp / Celular</label>
            <input :value="form.phone" @input="form.phone = applyPhoneMask($event.target.value)" type="tel" placeholder="(00) 00000-0000" required>
          </div>
          <div class="form-group">
            <label>Sua mensagem (Opcional)</label>
            <textarea v-model="form.message" placeholder="Conte um pouco sobre seu empreendimento..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
            {{ submitting ? 'Enviando...' : 'Enviar Solicitação' }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { gsap } from 'gsap'

const { get, post } = usePublicApi()
const toast = useToast()

const settings = ref(null)
const showContactForm = ref(false)
const submitting = ref(false)
const form = ref({
  name: '',
  email: '',
  phone: '',
  message: ''
})

const heroContentRef = ref(null)
const heroTitleRef = ref(null)
const heroSubRef = ref(null)
const heroActionsRef = ref(null)

onMounted(async () => {
  try {
    settings.value = await get('/p/settings')
  } catch (e) {
    console.error('Erro ao carregar configurações:', e)
  }

  // GSAP entrance timeline
  nextTick(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

    // Title: dramatic slide up with slight scale
    if (heroTitleRef.value) {
      gsap.set(heroTitleRef.value, { opacity: 0, y: 80, scale: 0.95 })
      tl.to(heroTitleRef.value, {
        opacity: 1, y: 0, scale: 1,
        duration: 1.2,
        ease: 'expo.out'
      })
    }

    // Subtitle: fade up
    if (heroSubRef.value) {
      gsap.set(heroSubRef.value, { opacity: 0, y: 40 })
      tl.to(heroSubRef.value, {
        opacity: 1, y: 0,
        duration: 0.9,
        ease: 'power3.out'
      }, '-=0.7')
    }

    // CTA buttons: staggered slide up
    if (heroActionsRef.value) {
      const buttons = heroActionsRef.value.children
      gsap.set(buttons, { opacity: 0, y: 30, scale: 0.9 })
      tl.to(buttons, {
        opacity: 1, y: 0, scale: 1,
        duration: 0.7,
        stagger: 0.15,
        ease: 'back.out(1.4)'
      }, '-=0.4')
    }
  })
})

const openWhatsapp = () => {
  if (!settings.value?.contactWhatsapp) return
  const phone = settings.value.contactWhatsapp.replace(/\D/g, '')
  const text = encodeURIComponent('Olá! Vim pelo site da Lotio e gostaria de mais informações.')
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
}

const submitContact = async () => {
  submitting.value = true
  try {
    await post('/p/settings/contact', form.value)
    toast.success('Solicitação enviada com sucesso! Em breve entraremos em contato.')
    showContactForm.value = false
    form.value = { name: '', email: '', phone: '', message: '' }
  } catch (e) {
    toast.error('Erro ao enviar solicitação. Tente novamente.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.hero {
  min-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0 40px;
  background-color: var(--gray-50);
  background-image: url('~/assets/img/banner-hero.jpg');
  background-size: cover;
  background-position: center;
  overflow: hidden;
  position: relative;
}

@media (min-width: 768px) {
  .hero {
    padding: 120px 0 60px;
  }
}

.hero-overlay {
  display: block;
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 100%);
  z-index: 1;
}

.hero-content {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  padding: 0 16px;
}

.hero-title {
  font-size: 2.75rem;
  line-height: 1.1;
  letter-spacing: -1.5px;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--gray-900);
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 5.5rem;
    line-height: 1.05;
    letter-spacing: -2.5px;
    margin-bottom: 24px;
  }
}

.hero-subtitle {
  font-size: 1.125rem;
  color: var(--gray-600);
  margin-bottom: 32px;
  max-width: 600px;
  line-height: 1.5;
  letter-spacing: -0.015em;
}

@media (min-width: 768px) {
  .hero-subtitle {
    font-size: 1.6rem;
    margin-bottom: 40px;
  }
}

.btn-apple-lg {
  border-radius: 980px;
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

@media (min-width: 768px) {
  .btn-apple-lg {
    font-size: 1.05rem;
    padding: 14px 32px;
  }
}

.btn-secondary.btn-ghost {
  background: transparent;
  color: var(--gray-800);
  border: none;
}

.btn-secondary.btn-ghost:hover {
  color: var(--primary);
}

.hero-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .hero-actions {
    flex-direction: row;
    gap: 24px;
  }
}
</style>
