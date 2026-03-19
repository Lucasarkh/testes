<template>
  <section id="cta" class="cta" ref="ctaSectionRef">
    <div class="container-landing">
      <div class="cta-inner">
        <h2 class="cta-title" ref="ctaTitleRef">Sua gestão de loteamentos, <br> em outro nível.</h2>
        <p class="cta-subtitle" ref="ctaSubRef">
          A plataforma completa para gerir, vender e automatizar o seu loteamento com tecnologia de ponta.
        </p>
        
        <div class="cta-form-container" ref="ctaFormRef">
          <form @submit.prevent="submitContact" class="cta-card-form">
            <div class="form-group">
              <input v-model="form.name" type="text" placeholder="Seu nome" required>
            </div>
            <div class="form-group">
              <input v-model="form.email" type="email" placeholder="E-mail corporativo" required>
            </div>
            <div class="form-group">
              <input :value="form.phone" @input="form.phone = applyPhoneMask($event.target.value)" type="tel" placeholder="WhatsApp" required>
            </div>
            <button type="submit" class="btn btn-primary btn-apple-lg btn-block" :disabled="submitting">
              {{ submitting ? 'Enviando...' : 'Quero Ver na Prática' }}
            </button>
          </form>
          <div class="cta-footer-links" v-if="settings?.contactWhatsapp">
            <p>Prefere conversar agora? <a @click.prevent="openWhatsapp" href="#" class="wa-link">Chamar no WhatsApp</a></p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const { get, post } = usePublicApi()
const toast = useToast()

const settings = ref(null)
const showContactForm = ref(false)
const submitting = ref(false)
const form = ref({ name: '', email: '', phone: '' })

const ctaSectionRef = ref(null)
const ctaTitleRef = ref(null)
const ctaSubRef = ref(null)
const ctaFormRef = ref(null)
let animationContext = null

onMounted(async () => {
  try {
    settings.value = await get('/p/settings')
  } catch (e) {
    console.error('Erro ao carregar configurações:', e)
  }

  // GSAP scroll-triggered CTA animations
  nextTick(() => {
    animationContext?.revert()
    animationContext = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ctaSectionRef.value,
          start: 'top 75%',
          once: true
        }
      })

      if (ctaTitleRef.value) {
        gsap.set(ctaTitleRef.value, { opacity: 0, y: 60, scale: 0.96 })
        tl.to(ctaTitleRef.value, {
          opacity: 1, y: 0, scale: 1,
          duration: 1,
          ease: 'expo.out'
        })
      }

      if (ctaSubRef.value) {
        gsap.set(ctaSubRef.value, { opacity: 0, y: 30 })
        tl.to(ctaSubRef.value, {
          opacity: 1, y: 0,
          duration: 0.8,
          ease: 'power3.out'
        }, '-=0.6')
      }

      if (ctaFormRef.value) {
        gsap.set(ctaFormRef.value, { opacity: 0, y: 50, scale: 0.95 })
        tl.to(ctaFormRef.value, {
          opacity: 1, y: 0, scale: 1,
          duration: 0.9,
          ease: 'back.out(1.2)'
        }, '-=0.4')
      }
    }, ctaSectionRef.value)
  })
})

onUnmounted(() => {
  animationContext?.revert()
  animationContext = null
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
    toast.success('Recebemos sua solicitação! Entraremos em contato em breve.')
    showContactForm.value = false
    form.value = { name: '', email: '', phone: '' }
  } catch (e) {
    toast.error('Ocorreu um erro. Tente novamente.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.cta {
  padding: 60px 0;
  background: radial-gradient(circle at top, var(--gray-100) 0%, var(--gray-50) 100%);
}

@media (min-width: 768px) {
  .cta {
    padding: 140px 0;
  }
}

.cta-inner {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  letter-spacing: -1.5px;
  color: var(--gray-900);
  line-height: 1.1;
}

@media (min-width: 768px) {
  .cta-title { 
    font-size: 4.8rem;
    margin-bottom: 24px;
    letter-spacing: -0.04em;
    line-height: 1.05;
  }
}

.cta-subtitle {
  font-size: 1.125rem;
  margin-bottom: 32px;
  color: var(--gray-500);
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
}

@media (min-width: 768px) {
  .cta-subtitle {
    font-size: 1.25rem;
    margin-bottom: 48px;
  }
}

.cta-form-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 0 8px;
}

.cta-card-form {
  background: white;
  padding: 24px;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.06);
  border: 1px solid var(--gray-100);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 768px) {
  .cta-card-form {
    padding: 48px;
    gap: 24px;
  }
}

.cta-card-form .form-group {
  margin-bottom: 0;
}

.cta-card-form input {
  width: 100%;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid var(--gray-200);
  background: white;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  outline: none;
}

.cta-card-form input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-50);
  transform: translateY(-1px);
}

.cta-footer-links {
  margin-top: 24px;
  font-size: 0.95rem;
  color: var(--gray-500);
}

.wa-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}

.wa-link:hover {
  text-decoration: underline;
}

.btn-apple-lg {
  border-radius: 12px;
  padding: 20px 24px;
  font-size: 1.125rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, #0056b3 100%);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
  white-space: normal;
  line-height: 1.2;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.btn-apple-lg:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
  background: linear-gradient(135deg, #0084ff 0%, #0066d6 100%);
}

.btn-apple-lg:active {
  transform: translateY(0);
}

.btn-block {
  width: 100%;
}
</style>
