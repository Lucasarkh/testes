<template>
  <section class="v4-section" id="contato" :style="{ ...sectionStyle, background: '#fbfbfd', padding: '120px 0' }">
    <div class="v4-container">
      <div class="v4-conversion-card-new">
        <div class="v4-conversion-content">
          <div class="v4-conversion-header-new">
            <div class="v4-badge-clean">
              <span class="v4-pulse-blue"></span>
              {{ conversionBadgeText }}
            </div>
            <h2 class="v4-title-display">{{ conversionTitle }}</h2>
            <p class="v4-subtitle-clean">{{ conversionSubtitle }}</p>

            <div v-if="availableLots > 0" class="v4-lot-badge-minimal">
              <span class="v4-sparkle"><i class="bi bi-stars" aria-hidden="true"></i></span> {{ conversionAvailabilityText }}
            </div>
          </div>

          <div class="v4-form-container-new">
            <div v-if="leadSuccess" class="v4-form-success-new">
              <div class="v4-success-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3>{{ leadSuccessTitle }}</h3>
              <p>{{ leadSuccessMessage }}</p>
              <button @click="leadSuccess = false" class="v4-btn-back">Voltar</button>
            </div>

            <form v-else class="v4-form-modern" @submit.prevent="submitLead" ref="formRef">
              <div class="v4-form-cols">
                <div class="v4-input-group">
                  <label>Seu nome completo *</label>
                  <input v-model="leadForm.name" required placeholder="Ex: João Silva" />
                </div>
                <div class="v4-input-group">
                  <label>Telefone / WhatsApp *</label>
                  <input :value="leadForm.phone" @input="leadForm.phone = applyPhoneMask(($event.target as HTMLInputElement).value)" required placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div class="v4-input-group">
                <label>E-mail *</label>
                <input v-model="leadForm.email" type="email" required placeholder="seu@email.com" />
              </div>

              <div v-if="unifiedAvailableLots.length" class="v4-input-group">
                <label>Tenho interesse no lote</label>
                <div class="v4-select-wrapper">
                  <select v-model="leadForm.mapElementId">
                    <option value="">Não tenho preferência</option>
                    <option v-for="lot in unifiedAvailableLots" :key="lot.id" :value="lot.id">
                      {{ lot.code || lot.name || lot.id }} {{ lot.lotDetails?.areaM2 ? `— ${lot.lotDetails.areaM2} m²` : '' }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="v4-input-group">
                <label>Mensagem (opcional)</label>
                <textarea v-model="leadForm.message" rows="3" :placeholder="leadMessagePlaceholder"></textarea>
              </div>

              <label class="v4-form-checkbox">
                <input v-model="leadForm.acceptTerms" type="checkbox" required />
                <span>{{ leadTermsLabel }}</span>
              </label>

              <div v-if="leadError" class="v4-form-error-msg">{{ leadError }}</div>

              <button type="submit" class="v4-btn-submit-modern" :disabled="submitting" @click="tracking.trackClick(formSubmitTrackingLabel)">
                {{ submitting ? 'Enviando...' : leadSubmitButtonLabel }}
              </button>
              <p class="v4-privacy-legal">Seus dados estão seguros conosco.</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTracking } from '~/composables/useTracking'

const props = defineProps<{
  project: any
  unifiedAvailableLots: any[]
  isPreLaunchMode: boolean
  projectSlug: string
  corretorCode: string
  sectionStyle: Record<string, string>
  conversionBadgeText: string
  conversionTitle: string
  conversionSubtitle: string
  conversionAvailabilityText: string
  leadSuccessTitle: string
  leadSuccessMessage: string
  leadSubmitButtonLabel: string
  leadMessagePlaceholder: string
  leadTermsLabel: string
  formSubmitTrackingLabel: string
  availableLots: number
}>()

const { fetchPublic } = usePublicApi()
const { maskPhone, validateEmail, validatePhone, unmask } = useMasks()
const { success: toastSuccess } = useToast()
const tracking = useTracking()

const leadForm = ref({ name: '', email: '', phone: '', mapElementId: '', message: '', acceptTerms: false })
const submitting = ref(false)
const leadSuccess = ref(false)
const leadError = ref('')
const formRef = ref(null)

const applyPhoneMask = (value: string) => maskPhone(value)

watch(() => leadForm.value.phone, (v) => {
  if (v) leadForm.value.phone = maskPhone(v)
})

const submitLead = async () => {
  leadError.value = ''

  if (!leadForm.value.name.trim()) {
    leadError.value = 'Por favor, informe seu nome.'
    return
  }

  const rawPhone = unmask(leadForm.value.phone)
  if (!validatePhone(rawPhone)) {
    leadError.value = 'Por favor, informe um telefone válido.'
    return
  }

  if (!validateEmail(leadForm.value.email)) {
    leadError.value = 'Por favor, informe um e-mail válido.'
    return
  }

  if (!leadForm.value.acceptTerms) {
    leadError.value = 'Você precisa aceitar os termos para continuar.'
    return
  }

  submitting.value = true

  try {
    const payload: Record<string, any> = {
      name: leadForm.value.name.trim(),
      email: leadForm.value.email.trim(),
      phone: rawPhone,
      message: leadForm.value.message.trim() || undefined,
      mapElementId: leadForm.value.mapElementId || undefined,
      source: 'landing_page',
      isPreLaunch: props.isPreLaunchMode,
    }

    if (props.corretorCode) {
      payload.corretorCode = props.corretorCode
    }

    await fetchPublic(`/p/${props.projectSlug}/leads`, {
      method: 'POST',
      body: payload,
    })

    leadSuccess.value = true
    toastSuccess('Interesse registrado com sucesso!')

    tracking.trackEvent({
      type: 'CONVERSION',
      category: 'LEAD',
      action: 'SUBMIT',
      label: props.formSubmitTrackingLabel,
      metadata: {
        source: 'landing_page',
        isPreLaunch: props.isPreLaunchMode,
        hasMapElement: !!leadForm.value.mapElementId,
        hasMessage: !!leadForm.value.message.trim(),
      },
    })

    leadForm.value = { name: '', email: '', phone: '', mapElementId: '', message: '', acceptTerms: false }
  } catch (err: any) {
    leadError.value = err?.message || 'Erro ao enviar. Tente novamente.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* Final Conversion Card Modern */
.v4-conversion-card-new {
  background: white;
  border-radius: 40px;
  max-width: 1000px;
  margin: 0 auto;
  box-shadow: 0 40px 100px rgba(0,0,0,0.06);
  border: 1px solid #d2d2d7;
  overflow: hidden;
}

.v4-conversion-content {
  display: flex;
  min-height: 600px;
}

@media (max-width: 900px) {
  .v4-conversion-content { flex-direction: column; }
  .v4-conversion-card-new { border-radius: 24px; }
}

.v4-conversion-header-new {
  flex: 1;
  background: #fbfbfd;
  padding: 80px 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (max-width: 900px) {
  .v4-conversion-header-new {
    background: #1d1d1f;
    color: white;
    text-align: center;
    padding: 60px 24px;
    align-items: center;
  }
}

.v4-form-container-new {
  flex: 1.2;
  padding: 80px 60px;
}

@media (max-width: 900px) {
  .v4-conversion-header-new { padding: 48px 32px; }
  .v4-form-container-new {
    padding: 40px 20px;
    background: white;
  }
}

.v4-badge-clean {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0071e3;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 24px;
}

@media (max-width: 900px) {
  .v4-badge-clean {
    color: #40a9ff;
    margin-bottom: 16px;
  }
}

.v4-title-display {
  font-size: 44px;
  font-weight: 600;
  line-height: 1.1;
  color: #1d1d1f;
  margin-bottom: 20px;
  letter-spacing: -0.02em;
}

@media (max-width: 900px) {
  .v4-title-display {
    font-size: 32px;
    color: white;
    margin-bottom: 16px;
  }
}

.v4-subtitle-clean {
  font-size: 19px;
  line-height: 1.5;
  color: #86868b;
  margin-bottom: 40px;
}

@media (max-width: 900px) {
  .v4-subtitle-clean {
    font-size: 16px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 32px;
  }
}

.v4-lot-badge-minimal {
  margin-top: auto;
  background: white;
  border: 1px solid #d2d2d7;
  padding: 16px 24px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: #1d1d1f;
}

@media (max-width: 900px) {
  .v4-lot-badge-minimal {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.1);
    color: white;
    font-size: 14px;
    padding: 12px 20px;
  }
}

.v4-form-modern {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.v4-form-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 600px) {
  .v4-form-cols { grid-template-columns: 1fr; }
}

.v4-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.v4-input-group label {
  font-size: 12px;
  font-weight: 600;
  color: #86868b;
  margin-left: 2px;
}

.v4-input-group input,
.v4-input-group select,
.v4-input-group textarea {
  width: 100%;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  font-size: 17px;
  color: #1d1d1f;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.v4-input-group input:focus,
.v4-input-group select:focus,
.v4-input-group textarea:focus {
  outline: none;
  border-color: #0071e3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.08);
}

.v4-btn-submit-modern {
  width: 100%;
  background: #0071e3;
  color: white;
  border: none;
  padding: 18px;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 12px;
}

.v4-btn-submit-modern:hover { background: #0077ed; transform: translateY(-1px); }
.v4-btn-submit-modern:active { transform: translateY(0); }

.v4-privacy-legal {
  text-align: center;
  font-size: 13px;
  color: #86868b;
  margin-top: 16px;
}

.v4-form-error-msg {
  background: #fff1f0;
  color: #df1125;
  padding: 12px;
  border-radius: 10px;
  font-size: 14px;
  text-align: center;
}

.v4-form-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #6e6e73;
  font-size: 13px;
  line-height: 1.45;
}

.v4-form-checkbox input {
  width: 18px;
  height: 18px;
  margin-top: 1px;
  flex: 0 0 auto;
}

.v4-form-success-new { text-align: center; padding: 40px 0; }
.v4-success-circle { width: 64px; height: 64px; background: #e6f7ed; color: #008a32; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
.v4-success-circle svg { width: 32px; height: 32px; }
.v4-btn-back { background: #f5f5f7; border: none; padding: 12px 32px; border-radius: 10px; cursor: pointer; margin-top: 24px; font-weight: 600; }

/* Form Styles */
.v4-conversion-form-wrapper {
  background: white;
  border-radius: 18px;
  padding: 40px;
  border: 1px solid #d2d2d7;
  box-shadow: var(--v4-shadow-elevated);
}

.v4-form-title { font-size: 24px; font-weight: 600; margin-bottom: 32px; text-align: center; }

.v4-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .v4-form-grid { grid-template-columns: 1fr; gap: 0; } }

.v4-form-group { margin-bottom: 24px; }
.v4-form-group label { display: block; font-size: 12px; font-weight: 600; color: #86868b; margin-bottom: 8px; }
.v4-form-group input, .v4-form-group select, .v4-form-group textarea {
  width: 100%; padding: 14px 16px; border: 1px solid #d2d2d7; border-radius: 12px; font-family: inherit; font-size: 17px; color: #1d1d1f; background: #fafafa;
}
.v4-form-group input:focus { outline: none; border-color: var(--v4-primary); background: white; }

.v4-btn-submit {
  width: 100%; background: var(--v4-primary); color: white; border: none; padding: 16px; border-radius: 12px; font-size: 17px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.2s;
}
.v4-btn-submit:hover { background: var(--v4-primary-hover); }

/* Success Message Improvements */
.v4-form-success {
  text-align: center;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  animation: v4-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.v4-success-icon {
  width: 72px;
  height: 72px;
  background: #32d74b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 24px;
  box-shadow: 0 12px 24px rgba(50, 215, 75, 0.25);
  position: relative;
}

.v4-success-icon::after {
  content: "";
  position: absolute;
  inset: -8px;
  border: 2px solid #32d74b;
  border-radius: 50%;
  opacity: 0.3;
  animation: v4-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.v4-form-success h3 {
  font-size: 28px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.v4-form-success p {
  font-size: 17px;
  line-height: 1.5;
  color: #86868b;
  max-width: 280px;
  margin: 0 auto;
}

@keyframes v4-fade-in {
  from { opacity: 0; transform: scale(0.95) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes v4-ping {
  75%, 100% {
    transform: scale(1.4);
    opacity: 0;
  }
}
</style>
