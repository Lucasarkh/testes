<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { usePublicApi } from '@/composables/usePublicApi'
import { useAiChatStore } from '@/stores/aiChat'
import { useTracking } from '@/composables/useTracking'

const props = defineProps<{
  project: any
}>()

const router = useRouter()
const route = useRoute()
const chatStore = useAiChatStore()
const tracking = useTracking()
const { post } = usePublicApi()

const input = ref('')
const loading = ref(false)
const loadingStatus = ref('')
const scrollContainer = ref<HTMLElement | null>(null)
const lgpdConsentAccepted = ref(false)
const consentClosing = ref(false)

const consentStorageKey = computed(() => {
  const projectSlug = props.project?.slug || 'global'
  return `lotio-ai-chat-consent:${projectSlug}`
})

// Persist isOpen and messages in store
const isOpen = computed({
  get: () => chatStore.isOpen,
  set: (val) => chatStore.isOpen = val
})

const messages = computed(() => chatStore.messages)
const showConsentBlock = computed(() => !lgpdConsentAccepted.value || consentClosing.value)

function closeChat() {
  isOpen.value = false
}

onMounted(() => {
  if (props.project?.name) {
    chatStore.init(props.project.name)
  }
  if (isOpen.value) {
    nextTick(scrollToBottom)
  }
})

watch(() => props.project?.name, (newName) => {
  if (newName) chatStore.init(newName)
})

watch(isOpen, (newVal) => {
  if (newVal) {
    nextTick(scrollToBottom)
  }
})

watch(() => props.project?.slug, () => {
  if (!process.client) return
  lgpdConsentAccepted.value = localStorage.getItem(consentStorageKey.value) === 'accepted'
}, { immediate: true })

const getPathPrefix = () => {
  return props.project?.slug ? `/${props.project.slug}` : ''
}

const navigateToLot = (code: string) => {
  const prefix = getPathPrefix()
  const path = prefix === '' ? `/${code}` : `${prefix}/${code}`
  const corretorCode = route.query.c || ''
  const finalUrl = corretorCode ? `${path}?c=${corretorCode}` : path
  router.push(finalUrl)
}

const navigateToUnits = (codes: string[]) => {
  const prefix = getPathPrefix()
  const path = prefix === '' ? `/unidades` : `${prefix}/unidades`
  const corretorCode = route.query.c || ''
  let finalUrl = `${path}?codes=${codes.join(',')}`
  if (corretorCode) finalUrl += `&c=${corretorCode}`
  router.push(finalUrl)
}

const getCards = (text: string) => {
  const parts = parseMessage(text)
  return parts.filter(p => p.type === 'card').map(p => p.content)
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message?.trim()) return error.message
  return 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente em instantes.'
}

const parseMessage = (text: string) => {
  const parts: { type: 'text' | 'card', content: any }[] = []
  const regex = /:::LOT_CARD\n?([\s\S]*?)\n?:::/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const txt = text.substring(lastIndex, match.index).trim()
      if (txt) parts.push({ type: 'text', content: txt })
    }
    
    try {
      const cardRaw = match[1]
      if (!cardRaw) {
        parts.push({ type: 'text', content: match[0] })
        lastIndex = regex.lastIndex
        continue
      }

      const cardData = JSON.parse(cardRaw)
      parts.push({ type: 'card', content: cardData })
    } catch (e) {
      parts.push({ type: 'text', content: match[0] })
    }
    
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    const txt = text.substring(lastIndex).trim()
    if (txt) parts.push({ type: 'text', content: txt })
  }

  return parts
}

function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    tracking.trackClick('Chat: Abrir', 'AI_CHAT')
  }
}

async function sendMessage() {
  if (!lgpdConsentAccepted.value || !input.value.trim() || loading.value) return
  
  const userMsg = input.value
  tracking.trackClick('Chat: Enviar Mensagem', 'AI_CHAT')
  
  chatStore.addMessage('user', userMsg)
  input.value = ''
  loading.value = true
  loadingStatus.value = 'Pensando...'
  
  await nextTick()
  scrollToBottom()

  try {
    // Artificial delays for "fluidity" and realism
    setTimeout(() => { 
      if (loading.value) loadingStatus.value = 'Consultando disponibilidade...' 
    }, 1500)
    
    setTimeout(() => { 
      if (loading.value) loadingStatus.value = 'Analisando melhores lotes...' 
    }, 3000)

    const res = await post(`/p/${props.project.slug}/ai/chat`, {
      message: userMsg
    })

    if (!res?.message || typeof res.message !== 'string') {
      throw new Error('Nao consegui montar uma resposta valida agora. Tente novamente em instantes.')
    }

    chatStore.addMessage('ai', res.message)

  } catch (error) {
    chatStore.addMessage('ai', getErrorMessage(error))
  } finally {
    loading.value = false
    loadingStatus.value = ''
    await nextTick()
    scrollToBottom()
  }
}

function onConsentChange(event: Event) {
  const target = event.target as HTMLInputElement
  lgpdConsentAccepted.value = target.checked

  if (!process.client) return

  if (target.checked) {
    localStorage.setItem(consentStorageKey.value, 'accepted')
    tracking.trackClick('Chat: Aceite LGPD', 'AI_CHAT')

    // Keep it visible long enough to play the close animation.
    consentClosing.value = true
    setTimeout(() => {
      consentClosing.value = false
    }, 240)

    return
  }

  consentClosing.value = false
  localStorage.removeItem(consentStorageKey.value)
}

function scrollToBottom() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

onMounted(() => {
  if (isOpen.value) scrollToBottom()
})
</script>

<template>
  <div v-if="project?.aiEnabled" class="ai-widget" :class="{ 'is-active': isOpen }">
    <!-- Bubble Button -->
    <button v-if="!isOpen" class="ai-bubble" @click="toggleChat">
      <span class="ai-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </span>
      <div class="ai-tooltip">Dúvidas? Fale comigo!</div>
    </button>

    <div v-if="isOpen" class="ai-modal-backdrop" @click="closeChat"></div>

    <!-- Chat Window -->
    <div v-if="isOpen" class="ai-window">
      <div class="ai-header">
        <div class="ai-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div class="ai-info">
          <div class="ai-name">Assistente {{ project?.name }}</div>
          <div class="ai-status">Online agora</div>
        </div>
        <button class="ai-close" @click="closeChat">&times;</button>
      </div>

      <div class="ai-messages" ref="scrollContainer">
        <div v-for="(msg, i) in messages" :key="i" class="ai-msg" :class="`ai-msg-${msg.role}`">
          <template v-if="msg.role === 'ai'">
            <div v-for="(part, pi) in parseMessage(msg.text)" :key="pi" class="ai-message-part">
              <div v-if="part.type === 'text'" class="ai-msg-bubble">{{ part.content }}</div>
              
              <div v-else-if="part.type === 'card'" class="lot-mini-card" @click="navigateToLot(part.content.code)">
                <div class="lot-mini-header">
                  <span class="lot-mini-code">{{ part.content.code }}</span>
                  <span class="lot-mini-status" :class="part.content.status.toLowerCase()">{{ part.content.status }}</span>
                </div>
                <div class="lot-mini-body">
                  <div class="lot-mini-info">
                    <span class="label">Área:</span>
                    <span class="value">{{ part.content.area }}</span>
                  </div>
                  <div class="lot-mini-info">
                    <span class="label">Preço:</span>
                    <span class="value">{{ part.content.price }}</span>
                  </div>
                  <div class="lot-mini-info">
                    <span class="label">Topografia:</span>
                    <span class="value">{{ part.content.topography }}</span>
                  </div>
                </div>
                <div v-if="part.content.tags && part.content.tags.length" class="lot-mini-tags">
                  <span v-for="tag in part.content.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
                <div class="lot-mini-footer">
                  <span>Ver detalhes</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            <!-- Multi-card Action -->
            <div v-if="getCards(msg.text).length > 1" class="ai-msg-actions">
              <button class="ai-action-btn" @click="navigateToUnits(getCards(msg.text).map(c => c.code))">
                Ver todos os {{ getCards(msg.text).length }} lotes encontrados
              </button>
            </div>
          </template>
          <div v-else class="ai-msg-bubble">{{ msg.text }}</div>
        </div>
        <div v-if="loading" class="ai-msg ai-msg-ai">
          <div class="ai-msg-bubble loading-bubble">
            <div class="searching-animation">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
            <span class="loading-text">{{ loadingStatus }}</span>
          </div>
        </div>
      </div>

      <form class="ai-input-area" @submit.prevent="sendMessage">
        <div v-if="showConsentBlock" class="ai-privacy-consent" :class="{ 'is-closing': consentClosing }">
          <label class="ai-consent-label">
            <input
              type="checkbox"
              :checked="lgpdConsentAccepted"
              @change="onConsentChange"
            />
            <span>
              Concordo que um resumo desta conversa com o assistente virtual possa ser registrado para atendimento e melhoria do serviço, conforme
              <NuxtLink to="/termos-de-uso" target="_blank">Termos de Uso</NuxtLink>
              e
              <NuxtLink to="/politica-de-privacidade" target="_blank">Política de Privacidade</NuxtLink>.
            </span>
          </label>
        </div>

        <div class="ai-input-wrapper">
          <input 
            v-model="input" 
            placeholder="Digite sua dúvida..." 
            maxlength="280"
            :disabled="!lgpdConsentAccepted"
          />
          <div class="input-limit" :class="{ 'error': input.length >= 280 }">
            {{ input.length }}/280
          </div>
        </div>
        <button type="submit" :disabled="!lgpdConsentAccepted || !input.trim() || loading">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.ai-widget {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 3200;
  font-family: var(--font-sans, sans-serif);
  --chat-bg: #0f1d21;
  --chat-surface: #142a30;
  --chat-surface-2: #1a3640;
  --chat-border: #2d4c57;
  --chat-text: #e7f4f7;
  --chat-muted: #a8c3cb;
  --chat-primary: #15b4a6;
  --chat-primary-strong: #0e9c90;
  --chat-user-bubble: #0ca678;
}

.ai-widget.is-active {
  left: 0;
  bottom: 0;
}

.ai-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(6px);
  z-index: 1;
  animation: aiFadeIn 0.2s ease;
}

@keyframes aiFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 768px) {
  .ai-widget {
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    left: 16px;
    right: auto;
  }
  .ai-bubble {
    width: 52px;
    height: 52px;
  }
  .ai-tooltip {
    display: none;
  }
}

.ai-bubble {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #15b4a6 0%, #0d8f86 100%);
  color: white;
  border: 1px solid #0b6f68;
  box-shadow: 0 8px 22px rgba(3, 42, 46, 0.45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
}

.ai-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-bubble:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 26px rgba(3, 42, 46, 0.52);
}

.ai-bubble.is-open {
  background: #113f4a;
}

.ai-tooltip {
  position: absolute;
  left: 70px;
  top: 50%;
  transform: translateY(-50%);
  background: #0f2b32;
  color: #dcf2f6;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.825rem;
  font-weight: 600;
  box-shadow: 0 6px 14px rgba(1, 16, 20, 0.35);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: all 0.2s;
}

.ai-bubble:hover .ai-tooltip {
  opacity: 1;
  left: 65px;
}

.ai-window {
  position: fixed;
  bottom: 110px;
  left: 24px;
  width: 350px;
  max-width: calc(100vw - 40px);
  height: 500px;
  max-height: calc(100vh - 120px);
  background: var(--chat-bg);
  border: 1px solid var(--chat-border);
  border-radius: 16px;
  box-shadow: 0 18px 45px rgba(3, 17, 20, 0.55);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
  z-index: 2;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .ai-window {
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    height: min(80vh, 640px);
    height: min(80dvh, 640px);
    max-height: 80dvh;
    border-radius: 20px 20px 0 0;
    animation: aiSheetUp 0.28s ease-out;
  }
}

@keyframes aiSheetUp {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}

.ai-header {
  padding: 16px 20px;
  background: #0a1418;
  border-bottom: 1px solid var(--chat-border);
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  background: #17323a;
  border: 1px solid #27515d;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.ai-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.ai-status {
  font-size: 0.7rem;
  color: #c9e7ed;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-status::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 50%;
}

.ai-close {
  margin-left: auto;
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.ai-close:hover {
  opacity: 1;
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--chat-surface);
}

.ai-msg {
  max-width: 85%;
  line-height: 1.5;
  font-size: 0.95rem;
}

.ai-msg-user {
  align-self: flex-end;
}

.ai-msg-ai {
  align-self: flex-start;
}

.loading-bubble {
  display: flex !important;
  align-items: center;
  gap: 10px;
  background: #173741 !important;
  color: #b8d5dd !important;
  font-style: italic;
  font-size: 0.85rem;
  padding: 12px 16px !important;
  border-bottom-left-radius: 2px !important;
}

.searching-animation {
  display: flex;
  gap: 4px;
}

.searching-animation .dot {
  width: 6px;
  height: 6px;
  background: #7dc6d2;
  border-radius: 50%;
  animation: pulse 1.5s infinite ease-in-out;
}

.searching-animation .dot:nth-child(2) { animation-delay: 0.2s; }
.searching-animation .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 100% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
}

.loading-text {
  white-space: nowrap;
}

.ai-msg-bubble {
  padding: 10px 14px;
  border-radius: 15px;
}

.ai-msg-user .ai-msg-bubble {
  background: var(--chat-user-bubble);
  color: white;
  border-bottom-right-radius: 2px;
}

.ai-msg-ai .ai-msg-bubble {
  background: var(--chat-surface-2);
  color: var(--chat-text);
  border: 1px solid var(--chat-border);
  border-bottom-left-radius: 2px;
  box-shadow: 0 2px 5px rgba(2, 14, 17, 0.24);
}

.ai-message-part + .ai-message-part {
  margin-top: 8px;
}

/* Lot Mini Card */
.lot-mini-card {
  background: #173741;
  border: 1px solid #2f5562;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 280px;
  cursor: pointer;
  transition: all 0.2s;
}

.lot-mini-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-color: #4f7886;
}

.lot-mini-footer {
  padding: 8px 12px;
  background: #122d35;
  border-top: 1px solid #2f5562;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #7ad7e4;
}

.ai-msg-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
  padding-left: 10px;
}

.ai-action-btn {
  background: var(--chat-primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 6px 14px rgba(9, 82, 92, 0.35);
}

.ai-action-btn:hover {
  background: var(--chat-primary-strong);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(9, 82, 92, 0.45);
}

.lot-mini-header {
  padding: 10px 12px;
  background: #122d35;
  border-bottom: 1px solid #2f5562;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lot-mini-code {
  font-weight: 700;
  color: #ebf9fc;
}

.lot-mini-status {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 10px;
}

.lot-mini-status.disponível {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}

.lot-mini-status.vendido {
  background: rgba(239, 68, 68, 0.12);
  color: #991b1b;
}

.lot-mini-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lot-mini-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.lot-mini-info .label {
  color: var(--chat-muted);
}

.lot-mini-info .value {
  font-weight: 600;
  color: #e6f4f8;
}

.lot-mini-tags {
  padding: 8px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  border-top: 1px dashed #38606d;
}

.lot-mini-tags .tag {
  font-size: 0.7rem;
  background: #0f2b32;
  color: #c9e7ed;
  padding: 2px 6px;
  border-radius: 4px;
}

.ai-input-area {
  padding: 12px 15px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: #10262d;
  border-top: 1px solid var(--chat-border);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.ai-privacy-consent {
  width: 100%;
  background: #0d2128;
  border: 1px solid #a6c9d1;
  border-radius: 10px;
  padding: 8px 10px;
  overflow: hidden;
  max-height: 160px;
  opacity: 1;
  transform: translateY(0);
  transition: max-height 0.24s ease, opacity 0.24s ease, transform 0.24s ease, margin 0.24s ease, padding 0.24s ease, border-width 0.24s ease;
}

.ai-privacy-consent.is-closing {
  max-height: 0;
  opacity: 0;
  transform: translateY(-6px);
  margin: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
}

.ai-consent-label {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.72rem;
  color: #cfe8ee;
  line-height: 1.45;
}

.ai-consent-label input {
  margin-top: 2px;
}

.ai-consent-label a {
  color: #61d9ff;
  text-decoration: underline;
}

.ai-consent-label input {
  accent-color: var(--chat-primary);
}

.ai-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.ai-input-area input {
  width: 100%;
  max-width: 100%;
  border: 1px solid #86aeb8;
  border-radius: 20px;
  padding: 11px 65px 11px 18px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
  background: #0b1e24;
  color: #ecfafc;
}

.ai-input-area input::placeholder {
  color: #8eb2bc;
}

.ai-input-area input:focus {
  border-color: var(--chat-primary);
  background: #0a1a20;
  box-shadow: 0 0 0 3px rgba(21, 180, 166, 0.2);
}

.input-limit {
  position: absolute;
  right: 15px;
  font-size: 0.65rem;
  color: #a8c7cf;
  pointer-events: none;
  font-weight: 500;
}

.input-limit.error {
  color: #ef4444;
}

.ai-input-area button {
  background: var(--chat-primary);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(8, 75, 84, 0.45);
}

.ai-input-area button:hover:not(:disabled) {
  transform: scale(1.05);
  background: var(--chat-primary-strong);
  box-shadow: 0 6px 12px rgba(8, 75, 84, 0.55);
}

.ai-input-area button:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

.ai-input-area button:disabled {
  opacity: 0.5;
}

@media (max-width: 420px) {
  .ai-input-area {
    padding: 10px 12px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    gap: 8px;
  }

  .ai-input-area input {
    padding: 10px 58px 10px 14px;
    font-size: 0.9rem;
  }

  .input-limit {
    right: 12px;
  }

  .ai-input-area button {
    width: 38px;
    height: 38px;
    min-width: 38px;
  }
}

.typing {
  font-weight: bold;
  letter-spacing: 2px;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}
</style>
