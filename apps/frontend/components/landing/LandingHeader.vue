<template>
  <header :class="{ 'scrolled': isScrolled }" class="header">
    <div class="container-landing">
      <NuxtLink to="/" class="logo">
        <img src="/img/logo.svg" alt="Lotio" class="logo-img" />
      </NuxtLink>

      <!-- Desktop Nav -->
      <nav class="nav-desktop">
        <ul class="nav-list">
          <li><a href="#features" class="nav-link">Funcionalidades</a></li>
          <li><a href="#cta" class="nav-link">Contato</a></li>
        </ul>
        
        <div class="nav-actions">
          <template v-if="!authStore.isLoggedIn">
            <NuxtLink to="/login" class="btn btn-primary btn-apple">
              Acessar Plataforma
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/painel" class="btn btn-primary btn-apple">
              Ir para o Painel
            </NuxtLink>
          </template>
        </div>
      </nav>

      <!-- Mobile Nav Toggle -->
      <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
        <svg v-if="!mobileMenuOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Mobile Nav Menu -->
      <Transition name="fade">
        <div v-if="mobileMenuOpen" class="nav-mobile">
          <a href="#features" class="nav-link" @click="closeMobileMenu">Funcionalidades</a>
          <a href="#cta" class="nav-link" @click="closeMobileMenu">Contato</a>
          <div class="nav-divider"></div>
          
          <template v-if="!authStore.isLoggedIn">
            <NuxtLink to="/login" class="btn btn-primary btn-block" @click="mobileMenuOpen = false">
              Acessar Plataforma
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/painel" class="btn btn-primary btn-block" @click="mobileMenuOpen = false">
              Acessar Meu Painel
            </NuxtLink>
          </template>
        </div>
      </Transition>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const isScrolled = ref(false)
const mobileMenuOpen = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 1000;
  transition: all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header.scrolled {
  background-color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
}

.container-landing {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.logo-img {
  height: 28px;
}

.nav-desktop {
  display: none;
  align-items: center;
  gap: 40px;
}

@media (min-width: 1024px) {
  .nav-desktop {
    display: flex;
  }
}

.nav-list {
  display: flex;
  list-style: none;
  gap: 32px;
}

.nav-link {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--gray-700);
  transition: color 0.3s ease;
  text-decoration: none;
  letter-spacing: -0.01em;
}

.nav-link:hover {
  color: var(--primary);
}

.login-link {
  padding: 0 16px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-apple {
  border-radius: 980px;
  font-size: 0.85rem;
  padding: 6px 18px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-apple:hover {
  opacity: 0.85;
  transform: translateY(0) scale(1.02);
}

.mobile-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: var(--gray-800);
}

@media (min-width: 1024px) {
  .mobile-toggle {
    display: none;
  }
}

.mobile-toggle svg {
  width: 24px;
  height: 24px;
}

.nav-mobile {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border-top: 1px solid var(--gray-100);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
