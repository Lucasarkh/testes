<template>
  <footer class="footer" ref="footerRef">
    <div class="container-landing">
      <div class="footer-grid" ref="footerGridRef">
        <div class="footer-brand">
          <NuxtLink to="/" class="logo">
            <img src="/img/logo.svg" alt="Lotio" class="logo-img" />
          </NuxtLink>
          <p class="footer-desc">
            Aliado das loteadoras, incorporadoras, imobiliárias e corretores. A nova fronteira digital para o mercado imobiliário.
          </p>
        </div>

        <div class="footer-links">
          <div class="link-group">
            <h4 class="link-title">Plataforma</h4>
            <NuxtLink to="/painel" class="link-item">Painel de Controle</NuxtLink>
            <NuxtLink to="/login" class="link-item">Acesso Restrito</NuxtLink>
          </div>
          <div class="link-group">
            <h4 class="link-title">Soluções</h4>
            <a href="#" class="link-item">Loteadoras</a>
            <a href="#" class="link-item">Incorporadoras</a>
            <a href="#" class="link-item">Imobiliárias e Corretores</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom" ref="footerBottomRef">
        <p class="copyright">&copy; {{ getYearInBrasilia() }} Lotio. Tecnologia para o futuro imobiliário.</p>
        <div class="footer-policy">
          <a href="/politica-de-privacidade">Privacidade</a>
          <a href="/termos-de-uso">Termos de Uso</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const footerRef = ref(null)
const footerGridRef = ref(null)
const footerBottomRef = ref(null)

onMounted(() => {
  nextTick(() => {
    // Footer grid columns: staggered fade-up
    if (footerGridRef.value) {
      const cols = footerGridRef.value.children
      gsap.set(cols, { opacity: 0, y: 40 })
      gsap.to(cols, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: footerRef.value,
          start: 'top 88%',
          once: true
        }
      })
    }

    // Footer bottom: subtle fade
    if (footerBottomRef.value) {
      gsap.set(footerBottomRef.value, { opacity: 0, y: 20 })
      gsap.to(footerBottomRef.value, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay: 0.4,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: footerBottomRef.value,
          start: 'top 95%',
          once: true
        }
      })
    }
  })
})
</script>

<style scoped>
.footer {
  background-color: var(--gray-50);
  color: var(--gray-900);
  padding: 60px 0 32px;
  border-top: 1px solid var(--gray-200);
}

@media (min-width: 768px) {
  .footer {
    padding: 100px 0 40px;
  }
}

.footer-grid {
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin-bottom: 60px;
}

@media (min-width: 1024px) {
  .footer-grid {
    flex-direction: row;
    justify-content: space-between;
    gap: 64px;
    margin-bottom: 80px;
  }
}

.footer-brand {
  max-width: 300px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  text-decoration: none;
}

.logo-img {
  height: 24px;
}

.footer-desc {
  color: var(--gray-500);
  font-size: 0.95rem;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 48px;
  flex-grow: 1;
  max-width: 600px;
}

@media (min-width: 640px) {
  .footer-links {
    grid-template-columns: repeat(3, 1fr);
  }
}

.link-title {
  color: var(--gray-900);
  margin-bottom: 24px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.link-item {
  display: block;
  color: var(--gray-500);
  text-decoration: none;
  margin-bottom: 12px;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.link-item:hover {
  color: var(--primary);
}

.footer-bottom {
  padding-top: 32px;
  border-top: 1px solid var(--gray-200);
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  text-align: center;
}

@media (min-width: 768px) {
  .footer-bottom {
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
  }
}

.copyright {
  color: var(--gray-400);
  font-size: 0.85rem;
}

.footer-policy {
  display: flex;
  gap: 24px;
}

.footer-policy a {
  color: var(--gray-400);
  font-size: 0.85rem;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-policy a:hover {
  color: var(--gray-600);
}
</style>
