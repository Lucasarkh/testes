<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const TOTAL = 12
let ticker = null
let animationContext = null

const sectionHeaderRef = ref(null)
const bentoGridRef = ref(null)

const updateRandomLot = () => {
  if (typeof document === 'undefined') return
  
  // Seleção via ID para ser ultra-preciso
  const parent = document.getElementById('feature-abstract-map')
  if (!parent) {
    ticker = setTimeout(updateRandomLot, 500)
    return
  }

  const elements = parent.querySelectorAll('.block')
  if (elements.length === 0) {
    ticker = setTimeout(updateRandomLot, 500)
    return
  }

  const randomIndex = Math.floor(Math.random() * elements.length)
  const el = elements[randomIndex]

  // Limpa animações anteriores
  gsap.killTweensOf(el)

  const tl = gsap.timeline({
    onComplete: () => {
      ticker = setTimeout(updateRandomLot, 1000 + Math.random() * 2000)
    }
  })

  // Animação forçada
  tl.to(el, { 
    backgroundColor: '#10b981',
    scale: 1.2,
    duration: 0.5, 
    overwrite: true,
    ease: 'power2.out' 
  })
  .to(el, { 
    backgroundColor: '#e5e7eb',
    scale: 1,
    duration: 0.8, 
    delay: 0.5,
    ease: 'power2.inOut' 
  })
}

onMounted(() => {
  // Inicia imediatamente e também após 1.5s (segurança Nuxt) para garantir que rode na HOME
  updateRandomLot()
  ticker = setTimeout(updateRandomLot, 1500)

  // GSAP scroll-triggered reveals
  nextTick(() => {
    animationContext?.revert()
    animationContext = gsap.context(() => {
      if (sectionHeaderRef.value) {
        const headerEls = sectionHeaderRef.value.children
        gsap.set(headerEls, { opacity: 0, y: 50 })
        gsap.to(headerEls, {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.2,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionHeaderRef.value,
            start: 'top 85%',
            once: true
          }
        })
      }

      if (bentoGridRef.value) {
        const cards = bentoGridRef.value.querySelectorAll('.bento-item')
        gsap.set(cards, { opacity: 0, y: 70, scale: 0.92 })
        gsap.to(cards, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: bentoGridRef.value,
            start: 'top 80%',
            once: true
          }
        })
      }
    })
  })
})

onUnmounted(() => { 
  if (ticker) clearTimeout(ticker) 
  gsap.killTweensOf('.block')
  animationContext?.revert()
  animationContext = null
})
</script>

<template>
  <section id="features" class="features">
    <div class="container-landing">
      <div class="section-header" ref="sectionHeaderRef">
        <h2 class="section-title">Tecnologia desenhada para <br><span class="text-primary">converter</span>.</h2>
        <p class="section-subtitle">
          Cada pixel do Lotio foi pensado para eliminar atritos entre o corretor, o mapa e a venda final.
        </p>
      </div>

      <div class="bento-grid" ref="bentoGridRef">
        <!-- Main: Interactive Maps -->
        <div class="bento-item main-feature">
          <div class="bento-content">
            <div class="bento-tag">Visualização</div>
            <h3 class="bento-title">Mapas Interativos de Alta Precisão</h3>
            <p class="bento-desc">Abandone os PDFs estáticos. Dê aos seus clientes e corretores a visão em tempo real de cada lote disponível, reservado ou vendido.</p>
          </div>
          <div class="bento-visual">
            <div id="feature-abstract-map" class="abstract-map">
              <div 
                v-for="i in TOTAL" 
                :key="i"
                class="block"
              ></div>
            </div>
          </div>
        </div>

        <!-- Conversion -->
        <div class="bento-item">
          <div class="bento-content">
            <div class="bento-tag">Conversão</div>
            <h3 class="bento-title">Lead Direto ao Ponto</h3>
            <p class="bento-desc">O interesse vira contato em segundos. Receba leads qualificados diretamente no seu WhatsApp com a identificação exata do lote desejado.</p>
          </div>
        </div>

        <!-- Payments -->
        <div class="bento-item highlight-payment">
          <div class="bento-content">
            <div class="bento-tag">Pagamentos</div>
            <h3 class="bento-title">Reserva Online com Gateway</h3>
            <p class="bento-desc">Conecte seu gateway de pagamento preferido — Asaas, Mercado Pago, PagarME e outros — e habilite a cobrança da reserva via PIX ou Cartão diretamente na plataforma.</p>
          </div>
        </div>

        <!-- Realtors -->
        <div class="bento-item">
          <div class="bento-content">
            <div class="bento-tag">Ecossistema</div>
            <h3 class="bento-title">Links Exclusivos para Corretores</h3>
            <p class="bento-desc">Capacite sua força de vendas com links personalizados que garantem o tracking correto de cada negociação.</p>
          </div>
        </div>

        <!-- Editor -->
        <div class="bento-item">
          <div class="bento-content">
            <div class="bento-tag">Autonomia</div>
            <h3 class="bento-title">Editor Canvas Integrado</h3>
            <p class="bento-desc">Você no controle. Desenhe, edite e publique alterações no seu empreendimento sem depender de terceiros.</p>
          </div>
        </div>

        <!-- Multi-tenant -->
        <div class="bento-item">
          <div class="bento-content">
            <div class="bento-tag">Escala</div>
            <h3 class="bento-title">Multi-Empreendimentos</h3>
            <p class="bento-desc">Gerencie um portfólio completo com facilidade. Troque de projeto em um clique com controle total de acesso.</p>
          </div>
        </div>

        <!-- Totem -->
        <div class="bento-item">
          <div class="bento-content">
            <div class="bento-tag">Presencial</div>
            <h3 class="bento-title">Experiência em Totens</h3>
            <p class="bento-desc">Otimizado para estandes de vendas. Utilize as URLs dos mapas em totens interativos para uma experiência touch imersiva, sem necessidade de softwares extras.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  padding: 60px 0;
  background-color: white;
}

@media (min-width: 768px) {
  .features {
    padding: 100px 0;
  }

}
@media (max-width: 767px) {
  .features .section-header{
    flex-direction: column;
  }
}

.section-header {
  text-align: center;
  max-width: 800px;
  margin: 0 auto 40px;
}

@media (min-width: 768px) {
  .section-header {
    margin: 0 auto 80px;
  }
}

.section-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: -1px;
  color: #111827;
  line-height: 1.1;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .section-title { 
    font-size: 4rem;
    margin-bottom: 24px;
    letter-spacing: -1.5px;
  }
}

.section-subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  max-width: 600px;
  margin: 0 auto;
  padding: 0 24px;
}

.bento-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  padding: 0 20px;
}

@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(6, 1fr);
    grid-auto-rows: minmax(300px, auto);
    gap: 24px;
  }
}

.bento-item {
  background-color: #f9fafb;
  border-radius: 24px;
  padding: 30px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #f3f4f6;
}

@media (min-width: 768px) {
  .bento-item {
    padding: 40px;
  }
  .main-feature { grid-column: span 4; grid-row: span 2; }
  .bento-item:nth-child(2) { grid-column: span 2; }
  .bento-item:nth-child(3) { grid-column: span 2; }
  .bento-item:nth-child(4) { grid-column: span 3; }
  .bento-item:nth-child(5) { grid-column: span 3; }
  .bento-item:nth-child(6) { grid-column: span 3; }
  .bento-item:nth-child(7) { grid-column: span 3; }
}

.bento-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.05);
}

.highlight-payment { 
  background: linear-gradient(135deg, #007AFF 0%, #0051FF 100%); 
  color: white;
  border: none;
}

.highlight-payment .bento-tag,
.highlight-payment .bento-title,
.highlight-payment .bento-desc {
  color: white;
}

.bento-tag {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #3b82f6;
  margin-bottom: 12px;
}

.bento-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: #111827;
}

.main-feature .bento-title {
  font-size: 2rem;
}

.bento-desc {
  color: #4b5563;
  font-size: 1rem;
  line-height: 1.5;
}

.bento-visual {
  margin-top: 40px;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.abstract-map {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 320px;
}

.block {
  aspect-ratio: 1;
  background-color: #e5e7eb;
  border-radius: 8px;
  border: 2px solid transparent;
  pointer-events: none;
}

.block.sold {
  background-color: rgba(239,68,68,0.2);
  border-color: rgba(239,68,68,0.45);
}
.block.reserved {
  background-color: rgba(245,158,11,0.22);
  border-color: rgba(245,158,11,0.5);
}

.map-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.map-leg {
  font-size: 0.72rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--gray-600);
}
.map-leg::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}
.map-leg--green::before { background: rgba(16,185,129,0.5); }
.map-leg--yellow::before { background: rgba(245,158,11,0.55); }
.map-leg--red::before { background: rgba(239,68,68,0.5); }

.text-primary { color: var(--primary); }
</style>
