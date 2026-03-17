<template>
  <div class="purchase-flow-page">
    <section class="purchase-hero">
      <div class="purchase-shell purchase-hero__content">
        <div>
          <p class="purchase-eyebrow">Acompanhe sua reserva</p>
          <h1>Sua compra continua daqui, com validacao em duas etapas.</h1>
          <p class="purchase-hero__text">
            Valide seu acesso por e-mail e WhatsApp, acompanhe o andamento da reserva e conclua as proximas etapas com a mesma identidade do loteamento.
          </p>
        </div>

        <div v-if="flow" class="purchase-reservation-card">
          <span class="purchase-reservation-card__label">Reserva ativa</span>
          <strong>{{ flow.project?.name || 'Empreendimento' }}</strong>
          <p>
            Lote {{ flow.lot?.code || flow.reservation?.lotCode || 'em definicao' }}
            <span v-if="flow.lot?.block">, quadra {{ flow.lot.block }}</span>
          </p>
          <p v-if="countdownLabel">Expira em {{ countdownLabel }}</p>
          <NuxtLink v-if="flow.currentRouteStep" :to="`/fluxo-compra/${flow.currentRouteStep}`" class="purchase-inline-link">
            Retomar etapa atual
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="purchase-shell purchase-main">
      <div v-if="loadingSession || loadingFlow" class="purchase-state-card purchase-state-card--centered">
        <div class="purchase-spinner"></div>
        <p>Carregando seu processo de compra...</p>
      </div>

      <div v-else-if="!flow" class="purchase-auth-grid">
        <article class="purchase-state-card">
          <div class="purchase-state-card__header">
            <p class="purchase-kicker">Sou cliente</p>
            <h2>Acompanhe sua reserva</h2>
            <p>Informe o e-mail usado na reserva. Vamos enviar um codigo por e-mail e outro por WhatsApp antes de liberar seus dados.</p>
          </div>

          <form class="purchase-form" @submit.prevent="requestOtp">
            <label class="purchase-field">
              <span>E-mail</span>
              <input v-model="otpForm.email" type="email" placeholder="cliente@exemplo.com" required />
            </label>
            <button class="purchase-button purchase-button--primary" type="submit" :disabled="submittingOtp">
              {{ submittingOtp ? 'Enviando codigos...' : 'Continuar com verificacao' }}
            </button>
          </form>

          <div v-if="otpRequested" class="purchase-otp-box">
            <p>Enviamos dois codigos para confirmar que esta reserva pertence a voce.</p>
            <div class="purchase-delivery-grid">
              <div class="purchase-delivery-pill">
                <span>E-mail</span>
                <strong>{{ otpDelivery.email }}</strong>
              </div>
              <div class="purchase-delivery-pill">
                <span>WhatsApp</span>
                <strong>{{ otpDelivery.whatsapp }}</strong>
              </div>
            </div>
            <form class="purchase-form purchase-form--compact" @submit.prevent="verifyOtp">
              <label class="purchase-field">
                <span>Codigo recebido por e-mail</span>
                <input v-model="otpForm.emailCode" type="text" maxlength="6" placeholder="000000" required />
              </label>
              <label class="purchase-field">
                <span>Codigo recebido por WhatsApp</span>
                <input v-model="otpForm.whatsappCode" type="text" maxlength="6" placeholder="000000" required />
              </label>
              <button class="purchase-button" type="submit" :disabled="verifyingOtp">
                {{ verifyingOtp ? 'Validando acesso...' : 'Validar e abrir reserva' }}
              </button>
            </form>
          </div>

          <p v-if="errorMessage" class="purchase-feedback purchase-feedback--error">{{ errorMessage }}</p>
        </article>

        <aside class="purchase-state-card purchase-benefits-card">
          <p class="purchase-kicker">Seguranca e continuidade</p>
          <ul class="purchase-benefits-list">
            <li>Retomar sua reserva exatamente da etapa em que ela parou.</li>
            <li>Validar seu acesso sem expor dados da compra antes do 2FA.</li>
            <li>Enviar documentos e confirmar condicoes com clareza operacional.</li>
            <li>Avancar com contrato e assinatura em um ambiente unico e seguro.</li>
          </ul>
        </aside>
      </div>

      <div v-else class="purchase-flow-grid">
        <aside class="purchase-sidebar-card">
          <div class="purchase-sidebar-card__header">
            <p class="purchase-kicker">Andamento</p>
            <h2>{{ flow.project?.name }}</h2>
            <p>Lote {{ flow.lot?.code || flow.reservation?.lotCode || 'em definicao' }}</p>
          </div>

          <div class="purchase-progress-list">
            <div
              v-for="item in flow.progress || []"
              :key="item.key"
              class="purchase-progress-item"
              :class="{
                'is-active': item.active,
                'is-complete': item.completed,
              }"
            >
              <span class="purchase-progress-item__dot"></span>
              <span>{{ item.label }}</span>
            </div>
          </div>

          <div class="purchase-sidebar-card__meta">
            <p><strong>Cliente:</strong> {{ flow.lead?.name || 'Nao informado' }}</p>
            <p><strong>E-mail:</strong> {{ flow.lead?.email || 'Nao informado' }}</p>
            <p v-if="countdownLabel"><strong>Expiracao:</strong> {{ countdownLabel }}</p>
          </div>

          <NuxtLink
            v-if="flow.project?.slug"
            :to="`/${flow.project.slug}`"
            class="purchase-inline-link purchase-inline-link--block"
          >
            Voltar ao loteamento
          </NuxtLink>

          <button class="purchase-button purchase-button--ghost" type="button" @click="logoutCustomer">
            Sair deste dispositivo
          </button>
        </aside>

        <div class="purchase-content-card">
          <div class="purchase-content-card__header">
            <div>
              <p class="purchase-kicker">Etapa atual</p>
              <h2>{{ stepTitle }}</h2>
              <p>{{ stepDescription }}</p>
            </div>
            <div class="purchase-step-chip">{{ flow.currentStep }}</div>
          </div>

          <p v-if="errorMessage" class="purchase-feedback purchase-feedback--error">{{ errorMessage }}</p>
          <p v-if="successMessage" class="purchase-feedback purchase-feedback--success">{{ successMessage }}</p>

          <section v-if="currentStepSlug === 'pagamento-reserva-confirmado'" class="purchase-section-stack">
            <div class="purchase-callout">
              <h3>Reserva confirmada</h3>
              <p>
                O pagamento inicial foi identificado. A proxima etapa e completar seus dados para seguirmos com a simulacao e o contrato.
              </p>
            </div>
            <button class="purchase-button purchase-button--primary" type="button" @click="goToCurrentFlowStep('cadastro-cliente')">
              Continuar cadastro
            </button>
          </section>

          <form v-else-if="currentStepSlug === 'cadastro-cliente'" class="purchase-form-grid" @submit.prevent="saveCustomerProfile">
            <label v-for="field in customerFields" :key="field.key" class="purchase-field" :class="{ 'purchase-field--full': field.fullWidth }">
              <span>{{ field.label }}</span>
              <input
                v-if="field.type !== 'textarea'"
                v-model="customerForm[field.key]"
                :type="field.type"
                :inputmode="field.inputmode || undefined"
                :placeholder="field.placeholder"
                :required="isRequiredField(field.key)"
              />
              <textarea
                v-else
                v-model="customerForm[field.key]"
                :placeholder="field.placeholder"
                :required="isRequiredField(field.key)"
                rows="3"
              ></textarea>
            </label>

            <div class="purchase-form-actions purchase-field--full">
              <button class="purchase-button purchase-button--primary" type="submit" :disabled="savingCustomer">
                {{ savingCustomer ? 'Salvando...' : 'Salvar e continuar' }}
              </button>
            </div>
          </form>

          <form v-else-if="currentStepSlug === 'cadastro-conjuge'" class="purchase-form-grid" @submit.prevent="saveSpouseProfile">
            <label v-for="field in spouseFields" :key="field.key" class="purchase-field" :class="{ 'purchase-field--full': field.fullWidth }">
              <span>{{ field.label }}</span>
              <input
                v-if="field.type !== 'textarea'"
                v-model="spouseForm[field.key]"
                :type="field.type"
                :inputmode="field.inputmode || undefined"
                :placeholder="field.placeholder"
              />
              <textarea
                v-else
                v-model="spouseForm[field.key]"
                :placeholder="field.placeholder"
                rows="3"
              ></textarea>
            </label>

            <div class="purchase-form-actions purchase-field--full">
              <button class="purchase-button purchase-button--primary" type="submit" :disabled="savingSpouse">
                {{ savingSpouse ? 'Salvando...' : 'Salvar conjugue' }}
              </button>
            </div>
          </form>

          <section v-else-if="currentStepSlug === 'upload-documentos'" class="purchase-section-stack">
            <div class="purchase-callout">
              <h3>Documentos obrigatorios</h3>
              <p>Envie os arquivos exigidos para liberar a simulacao financeira.</p>
            </div>

            <div class="purchase-doc-grid">
              <article v-for="requirement in flow.config?.requiredDocuments || []" :key="requirement.documentType" class="purchase-doc-card">
                <div>
                  <p class="purchase-doc-card__title">{{ documentLabels[requirement.documentType] || requirement.documentType }}</p>
                  <p class="purchase-doc-card__status" :class="findUploadedDocument(requirement.documentType) ? 'is-ready' : 'is-pending'">
                    {{ findUploadedDocument(requirement.documentType) ? 'Enviado' : 'Pendente' }}
                  </p>
                </div>

                <label class="purchase-field purchase-field--compact">
                  <span>Documento de</span>
                  <select v-model="documentRoles[requirement.documentType]">
                    <option value="PRIMARY">Titular</option>
                    <option v-if="flow.requiresSpouse" value="SPOUSE">Conjuge</option>
                  </select>
                </label>

                <input
                  class="purchase-file-input"
                  type="file"
                  :disabled="uploadingDocumentType === requirement.documentType"
                  @change="handleDocumentUpload(requirement.documentType, $event)"
                />

                <a
                  v-if="findUploadedDocument(requirement.documentType)?.fileUrl"
                  :href="findUploadedDocument(requirement.documentType)?.fileUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="purchase-inline-link"
                >
                  Abrir ultimo arquivo enviado
                </a>
              </article>
            </div>
          </section>

          <section v-else-if="currentStepSlug === 'simulacao-pagamento'" class="purchase-section-stack">
            <div class="purchase-callout">
              <h3>Escolha sua condicao</h3>
              <p>Selecione uma tabela e a combinacao que melhor atende sua compra.</p>
            </div>

            <div class="purchase-simulation-list">
              <article v-for="table in flow.paymentTables || []" :key="table.id" class="purchase-simulation-card">
                <div class="purchase-simulation-card__header">
                  <div>
                    <h3>{{ table.name }}</h3>
                    <p>Entrada minima de {{ formatPercent(table.entryMinPercent) }} e correcao por {{ table.correctionIndex }}</p>
                  </div>
                </div>

                <label
                  v-for="condition in table.conditions || []"
                  :key="condition.id"
                  class="purchase-simulation-option"
                  :class="{ 'is-selected': selectedPaymentConditionId === condition.id }"
                >
                  <input
                    v-model="selectedPaymentConditionId"
                    type="radio"
                    :value="condition.id"
                    @change="selectedPaymentTableId = table.id"
                  />
                  <span>
                    {{ condition.numberInstallments }}x de {{ formatCurrency(condition.installmentAmount) }}
                    com entrada de {{ formatCurrency(condition.entryAmount) }}
                  </span>
                  <strong>{{ formatCurrency(condition.totalAmount || estimatedTotal(table, condition)) }}</strong>
                </label>
              </article>
            </div>

            <button class="purchase-button purchase-button--primary" type="button" :disabled="savingSimulation || !selectedPaymentConditionId" @click="saveSimulation">
              {{ savingSimulation ? 'Salvando simulacao...' : 'Aprovar simulacao' }}
            </button>
          </section>

          <section v-else-if="currentStepSlug === 'confirmacao-condicoes'" class="purchase-section-stack">
            <div class="purchase-callout">
              <h3>Confirme as condicoes aprovadas</h3>
              <p>Revise o resumo abaixo antes de seguir para a geracao do contrato.</p>
            </div>

            <div class="purchase-summary-grid">
              <div class="purchase-summary-card">
                <span>Tabela</span>
                <strong>{{ flow.simulationSnapshot?.paymentTableName || 'Nao selecionada' }}</strong>
              </div>
              <div class="purchase-summary-card">
                <span>Entrada</span>
                <strong>{{ formatCurrency(flow.simulationSnapshot?.entryAmount) }}</strong>
              </div>
              <div class="purchase-summary-card">
                <span>Parcelas</span>
                <strong>{{ flow.simulationSnapshot?.numberInstallments || 0 }}x</strong>
              </div>
              <div class="purchase-summary-card">
                <span>Total estimado</span>
                <strong>{{ formatCurrency(flow.simulationSnapshot?.totalAmount) }}</strong>
              </div>
            </div>

            <label class="purchase-checkbox">
              <input v-model="conditionsAccepted" type="checkbox" />
              <span>Confirmo que revisei e concordo com as condicoes desta simulacao.</span>
            </label>

            <button class="purchase-button purchase-button--primary" type="button" :disabled="confirmingConditions || !conditionsAccepted" @click="confirmConditions">
              {{ confirmingConditions ? 'Confirmando...' : 'Confirmar condicoes' }}
            </button>
          </section>

          <section v-else-if="currentStepSlug === 'gerar-contrato'" class="purchase-section-stack">
            <div class="purchase-callout">
              <h3>Geracao do contrato</h3>
              <p>Quando estiver pronto, gere o contrato com os dados do titular, do lote e da simulacao aprovada.</p>
            </div>

            <button class="purchase-button purchase-button--primary" type="button" :disabled="generatingContract" @click="generateContract">
              {{ generatingContract ? 'Gerando contrato...' : 'Gerar contrato' }}
            </button>
          </section>

          <section v-else-if="currentStepSlug === 'assinar-contrato'" class="purchase-section-stack">
            <div class="purchase-callout">
              <h3>Assinatura</h3>
              <p>O contrato ja foi gerado. Confira o arquivo e conclua a assinatura manual para registrar o aceite.</p>
            </div>

            <a
              v-if="flow.latestContract?.pdfUrl"
              :href="flow.latestContract.pdfUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="purchase-inline-link purchase-inline-link--block"
            >
              Abrir contrato em PDF
            </a>

            <label class="purchase-field">
              <span>Nome do assinante</span>
              <input v-model="contractSignerName" type="text" placeholder="Nome completo de quem esta assinando" />
            </label>

            <button class="purchase-button purchase-button--primary" type="button" :disabled="signingContract" @click="signContract">
              {{ signingContract ? 'Registrando assinatura...' : 'Registrar assinatura' }}
            </button>
          </section>

          <section v-else class="purchase-section-stack">
            <div class="purchase-callout purchase-callout--success">
              <h3>Processo concluido</h3>
              <p>
                O fluxo chegou na etapa final. Nossa equipe comercial pode concluir a confirmacao da venda no painel interno a qualquer momento.
              </p>
            </div>

            <div class="purchase-summary-grid">
              <div class="purchase-summary-card">
                <span>Status atual</span>
                <strong>{{ flow.currentStep }}</strong>
              </div>
              <div class="purchase-summary-card">
                <span>Contrato</span>
                <strong>{{ flow.latestContract?.status || 'Nao gerado' }}</strong>
              </div>
              <div class="purchase-summary-card">
                <span>Simulacao</span>
                <strong>{{ flow.simulationSnapshot?.paymentTableName || 'Nao selecionada' }}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
type FlowPayload = Record<string, any>
type UploadResponse = { url: string; key: string; publicUrl: string }

const publicApi = usePublicApi()
const route = useRoute()
const router = useRouter()

const loadingSession = ref(true)
const loadingFlow = ref(false)
const submittingOtp = ref(false)
const verifyingOtp = ref(false)
const savingCustomer = ref(false)
const savingSpouse = ref(false)
const uploadingDocumentType = ref('')
const savingSimulation = ref(false)
const confirmingConditions = ref(false)
const generatingContract = ref(false)
const signingContract = ref(false)

const flow = ref<FlowPayload | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const otpRequested = ref(false)
const conditionsAccepted = ref(false)
const selectedPaymentTableId = ref('')
const selectedPaymentConditionId = ref('')
const contractSignerName = ref('')
const otpDelivery = reactive({
  email: '',
  whatsapp: '',
})

const otpForm = reactive({
  email: '',
  emailCode: '',
  whatsappCode: '',
})

const customerForm = reactive<Record<string, any>>({
  name: '',
  email: '',
  phone: '',
  cpf: '',
  rg: '',
  maritalStatus: '',
  occupation: '',
  monthlyIncome: '',
  address: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
})

const spouseForm = reactive<Record<string, any>>({
  name: '',
  email: '',
  phone: '',
  cpf: '',
  rg: '',
  maritalStatus: '',
  occupation: '',
  monthlyIncome: '',
  address: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
})

const documentRoles = reactive<Record<string, 'PRIMARY' | 'SPOUSE'>>({})

const documentLabels: Record<string, string> = {
  RG: 'RG',
  CPF: 'CPF',
  CNH: 'CNH',
  CERTIDAO_CASAMENTO: 'Certidao de casamento',
  COMPROVANTE_RENDA: 'Comprovante de renda',
  COMPROVANTE_RESIDENCIA: 'Comprovante de residencia',
  CONTRATO_SOCIAL: 'Contrato social',
  OUTROS: 'Outros',
}

const fieldCatalog = [
  { key: 'name', label: 'Nome completo', type: 'text', placeholder: 'Seu nome completo' },
  { key: 'email', label: 'E-mail', type: 'email', placeholder: 'cliente@exemplo.com' },
  { key: 'phone', label: 'Telefone', type: 'text', placeholder: '(11) 99999-0000' },
  { key: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00', inputmode: 'numeric' },
  { key: 'rg', label: 'RG', type: 'text', placeholder: '00.000.000-0' },
  { key: 'maritalStatus', label: 'Estado civil', type: 'text', placeholder: 'Casado, solteiro, uniao estavel...' },
  { key: 'occupation', label: 'Profissao', type: 'text', placeholder: 'Sua ocupacao atual' },
  { key: 'monthlyIncome', label: 'Renda mensal', type: 'number', placeholder: '0,00', inputmode: 'decimal' },
  { key: 'address', label: 'Endereco', type: 'textarea', placeholder: 'Rua, numero, complemento', fullWidth: true },
  { key: 'addressCity', label: 'Cidade', type: 'text', placeholder: 'Cidade' },
  { key: 'addressState', label: 'Estado', type: 'text', placeholder: 'UF' },
  { key: 'addressZip', label: 'CEP', type: 'text', placeholder: '00000-000', inputmode: 'numeric' },
]

const customerFields = computed(() => fieldCatalog)
const spouseFields = computed(() => fieldCatalog)

const currentStepSlug = computed(() => {
  const stepParam = route.params.step
  if (typeof stepParam === 'string' && stepParam.trim()) return stepParam
  return String(flow.value?.currentRouteStep || 'pagamento-reserva-confirmado')
})

const countdownLabel = computed(() => {
  const expiresAt = flow.value?.reservationExpiresAt || flow.value?.reservation?.reservationExpiresAt
  if (!expiresAt) return ''
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return 'reserva expirada'
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
})

const stepMeta = computed(() => {
  const map: Record<string, { title: string; description: string }> = {
    'pagamento-reserva-confirmado': {
      title: 'Pagamento da reserva confirmado',
      description: 'Sua reserva esta ativa. Agora precisamos concluir o cadastro para seguir com a venda.',
    },
    'cadastro-cliente': {
      title: 'Cadastro do titular',
      description: 'Preencha os dados principais do comprador conforme os requisitos deste empreendimento.',
    },
    'cadastro-conjuge': {
      title: 'Cadastro do conjugue',
      description: 'Este projeto exige os dados do conjugue antes do envio dos documentos.',
    },
    'upload-documentos': {
      title: 'Envio de documentos',
      description: 'Anexe os arquivos obrigatorios para validar a compra e liberar o contrato.',
    },
    'simulacao-pagamento': {
      title: 'Simulacao de pagamento',
      description: 'Escolha uma tabela comercial e aprove a condicao financeira desejada.',
    },
    'confirmacao-condicoes': {
      title: 'Confirmacao das condicoes',
      description: 'Revise a simulacao selecionada e confirme o aceite antes do contrato.',
    },
    'gerar-contrato': {
      title: 'Geracao do contrato',
      description: 'O sistema vai montar o contrato com base no template ativo do empreendimento.',
    },
    'assinar-contrato': {
      title: 'Assinatura do contrato',
      description: 'Confira o PDF gerado e registre a assinatura para finalizar o fluxo do cliente.',
    },
    'venda-confirmada': {
      title: 'Venda em etapa final',
      description: 'Seu processo chegou ao fim do fluxo do cliente e aguarda confirmacao comercial.',
    },
  }
  return map[currentStepSlug.value] || map['pagamento-reserva-confirmado']
})

const stepTitle = computed(() => stepMeta.value.title)
const stepDescription = computed(() => stepMeta.value.description)

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function normalizeMoneyValue(value: any) {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function applyProfile(target: Record<string, any>, source?: Record<string, any> | null) {
  for (const field of fieldCatalog) {
    const value = source?.[field.key]
    target[field.key] = value === null || value === undefined ? '' : String(value)
  }
}

function isRequiredField(fieldKey: string) {
  return Boolean(flow.value?.config?.requiredFields?.find((item: any) => item.field === fieldKey && item.required))
}

function findUploadedDocument(documentType: string) {
  return flow.value?.documents?.filter((item: any) => item.documentType === documentType).slice(-1)[0] || null
}

function formatCurrency(value: any) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatPercent(value: any) {
  return `${Number(value || 0).toFixed(0)}%`
}

function estimatedTotal(table: any, condition: any) {
  return Number(condition.entryAmount || 0) + Number(condition.installmentAmount || 0) * Number(condition.numberInstallments || 0)
}

async function loadFlow(syncRoute = true) {
  loadingFlow.value = true
  clearMessages()
  try {
    const data = await publicApi.get('/cliente/processo-compra')
    flow.value = data
    conditionsAccepted.value = Boolean(data?.currentStep === 'GERAR_CONTRATO' || data?.condicoesConfirmadas)
    selectedPaymentTableId.value = String(data?.selectedPaymentTableId || data?.paymentTables?.[0]?.id || '')
    selectedPaymentConditionId.value = String(data?.selectedPaymentConditionId || data?.paymentTables?.[0]?.conditions?.[0]?.id || '')
    contractSignerName.value = data?.customer?.name || data?.lead?.name || ''
    applyProfile(customerForm, data?.customer || data?.lead)
    applyProfile(spouseForm, data?.spouse)

    for (const requirement of data?.config?.requiredDocuments || []) {
      if (!documentRoles[requirement.documentType]) {
        documentRoles[requirement.documentType] = 'PRIMARY'
      }
    }

    if (syncRoute && data?.currentRouteStep) {
      await goToCurrentFlowStep(data.currentRouteStep, true)
    }
  } catch (error: any) {
    flow.value = null
    if (error?.status && error.status !== 401) {
      errorMessage.value = error.message || 'Nao foi possivel recuperar seu fluxo de compra.'
    }
  } finally {
    loadingFlow.value = false
  }
}

async function bootstrapSession() {
  loadingSession.value = true
  try {
    await publicApi.get('/cliente/reserva-ativa')
    await loadFlow(true)
  } catch {
    flow.value = null
  } finally {
    loadingSession.value = false
  }
}

async function requestOtp() {
  submittingOtp.value = true
  clearMessages()
  try {
    const response = await publicApi.post('/cliente/otp/request', {
      email: otpForm.email,
    })
    otpRequested.value = true
    otpDelivery.email = response?.channels?.email || otpForm.email
    otpDelivery.whatsapp = response?.channels?.whatsapp || 'WhatsApp cadastrado'
    successMessage.value = 'Codigos enviados. Valide os dois canais para continuar.'
  } catch (error: any) {
    errorMessage.value = error.message || 'Nao foi possivel enviar o codigo.'
  } finally {
    submittingOtp.value = false
  }
}

async function verifyOtp() {
  verifyingOtp.value = true
  clearMessages()
  try {
    await publicApi.post('/cliente/otp/verify', {
      email: otpForm.email,
      emailCode: otpForm.emailCode,
      whatsappCode: otpForm.whatsappCode,
    })
    successMessage.value = 'Acesso liberado. Carregando processo salvo...'
    await loadFlow(true)
  } catch (error: any) {
    errorMessage.value = error.message || 'Codigo invalido ou expirado.'
  } finally {
    verifyingOtp.value = false
  }
}

async function saveCustomerProfile() {
  savingCustomer.value = true
  clearMessages()
  try {
    await publicApi.put('/cliente/processo-compra/cadastro-cliente', {
      ...customerForm,
      monthlyIncome: normalizeMoneyValue(customerForm.monthlyIncome),
    })
    successMessage.value = 'Cadastro do titular salvo.'
    await loadFlow(true)
  } catch (error: any) {
    errorMessage.value = error.message || 'Nao foi possivel salvar o cadastro.'
  } finally {
    savingCustomer.value = false
  }
}

async function saveSpouseProfile() {
  savingSpouse.value = true
  clearMessages()
  try {
    await publicApi.put('/cliente/processo-compra/cadastro-conjuge', {
      ...spouseForm,
      monthlyIncome: normalizeMoneyValue(spouseForm.monthlyIncome),
    })
    successMessage.value = 'Cadastro do conjugue salvo.'
    await loadFlow(true)
  } catch (error: any) {
    errorMessage.value = error.message || 'Nao foi possivel salvar o cadastro do conjugue.'
  } finally {
    savingSpouse.value = false
  }
}

async function handleDocumentUpload(documentType: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingDocumentType.value = documentType
  clearMessages()

  try {
    const upload = await publicApi.post('/cliente/processo-compra/documentos/upload-url', {
      documentType,
      role: documentRoles[documentType] || 'PRIMARY',
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    }) as UploadResponse

    const uploadResult = await fetch(upload.url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    })

    if (!uploadResult.ok) {
      throw new Error('Falha ao enviar o arquivo para o armazenamento seguro.')
    }

    await publicApi.post('/cliente/processo-compra/documentos', {
      documentType,
      role: documentRoles[documentType] || 'PRIMARY',
      fileName: file.name,
      fileUrl: upload.publicUrl,
      mimeType: file.type || 'application/octet-stream',
    })

    successMessage.value = 'Documento enviado com sucesso.'
    await loadFlow(true)
  } catch (error: any) {
    errorMessage.value = error.message || 'Nao foi possivel enviar o documento.'
  } finally {
    uploadingDocumentType.value = ''
    input.value = ''
  }
}

async function saveSimulation() {
  savingSimulation.value = true
  clearMessages()
  try {
    await publicApi.post('/cliente/processo-compra/simulacao', {
      paymentTableId: selectedPaymentTableId.value,
      paymentConditionId: selectedPaymentConditionId.value,
    })
    successMessage.value = 'Simulacao aprovada com sucesso.'
    await loadFlow(true)
  } catch (error: any) {
    errorMessage.value = error.message || 'Nao foi possivel aprovar a simulacao.'
  } finally {
    savingSimulation.value = false
  }
}

async function confirmConditions() {
  confirmingConditions.value = true
  clearMessages()
  try {
    await publicApi.post('/cliente/processo-compra/confirmar-condicoes', { accepted: true })
    successMessage.value = 'Condicoes confirmadas.'
    await loadFlow(true)
  } catch (error: any) {
    errorMessage.value = error.message || 'Nao foi possivel confirmar as condicoes.'
  } finally {
    confirmingConditions.value = false
  }
}

async function generateContract() {
  generatingContract.value = true
  clearMessages()
  try {
    await publicApi.post('/cliente/processo-compra/gerar-contrato', {})
    successMessage.value = 'Contrato gerado com sucesso.'
    await loadFlow(true)
  } catch (error: any) {
    errorMessage.value = error.message || 'Nao foi possivel gerar o contrato.'
  } finally {
    generatingContract.value = false
  }
}

async function signContract() {
  signingContract.value = true
  clearMessages()
  try {
    await publicApi.post('/cliente/processo-compra/assinar-contrato', {
      signerName: contractSignerName.value || undefined,
    })
    successMessage.value = 'Assinatura registrada.'
    await loadFlow(true)
  } catch (error: any) {
    errorMessage.value = error.message || 'Nao foi possivel registrar a assinatura.'
  } finally {
    signingContract.value = false
  }
}

async function logoutCustomer() {
  await publicApi.post('/cliente/logout', {})
  flow.value = null
  otpRequested.value = false
  otpForm.emailCode = ''
  otpForm.whatsappCode = ''
  otpDelivery.email = ''
  otpDelivery.whatsapp = ''
  clearMessages()
  if (route.path !== '/sou-cliente') {
    await router.replace('/sou-cliente')
  }
}

async function goToCurrentFlowStep(step: string, replace = false) {
  const target = `/fluxo-compra/${step}`
  if (route.path === target) return
  if (replace) {
    await router.replace(target)
    return
  }
  await router.push(target)
}

watch(
  () => flow.value?.currentRouteStep,
  async (nextStep) => {
    if (!nextStep || !flow.value) return
    if (route.path === '/sou-cliente') {
      await goToCurrentFlowStep(nextStep, true)
      return
    }
    if (typeof route.params.step === 'string' && route.params.step && route.params.step !== nextStep) {
      await goToCurrentFlowStep(nextStep, true)
    }
  },
)

onMounted(() => {
  bootstrapSession()
})
</script>

<style scoped>
.purchase-flow-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(220, 252, 231, 0.8), transparent 26%),
    radial-gradient(circle at top right, rgba(254, 240, 138, 0.5), transparent 24%),
    linear-gradient(180deg, #f7f7ef 0%, #f5efe5 52%, #f8fafc 100%);
  color: #172033;
}

.purchase-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
}

.purchase-hero {
  padding: 88px 0 40px;
}

.purchase-hero__content {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.8fr);
  gap: 24px;
  align-items: start;
}

.purchase-eyebrow,
.purchase-kicker {
  margin: 0 0 10px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8b5e34;
}

.purchase-hero h1,
.purchase-state-card h2,
.purchase-content-card h2,
.purchase-sidebar-card h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.04;
}

.purchase-hero h1 {
  font-size: clamp(2.2rem, 4vw, 4.2rem);
  max-width: 11ch;
}

.purchase-hero__text {
  max-width: 58ch;
  margin: 16px 0 0;
  font-size: 1.04rem;
  line-height: 1.7;
  color: #475569;
}

.purchase-reservation-card,
.purchase-state-card,
.purchase-sidebar-card,
.purchase-content-card {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

.purchase-reservation-card {
  padding: 24px;
}

.purchase-reservation-card__label {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #0f766e;
}

.purchase-reservation-card strong {
  display: block;
  font-size: 1.15rem;
  margin-bottom: 8px;
}

.purchase-reservation-card p {
  margin: 0 0 8px;
  color: #475569;
}

.purchase-main {
  padding-bottom: 56px;
}

.purchase-state-card,
.purchase-sidebar-card,
.purchase-content-card {
  padding: 28px;
}

.purchase-state-card--centered {
  display: flex;
  min-height: 280px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.purchase-auth-grid,
.purchase-flow-grid {
  display: grid;
  gap: 24px;
}

.purchase-auth-grid {
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
}

.purchase-flow-grid {
  grid-template-columns: 320px minmax(0, 1fr);
  align-items: start;
}

.purchase-benefits-list,
.purchase-progress-list {
  display: grid;
  gap: 12px;
}

.purchase-delivery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.purchase-delivery-pill {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.purchase-delivery-pill span {
  display: block;
  margin-bottom: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8b5e34;
}

.purchase-delivery-pill strong {
  color: #172033;
}

.purchase-benefits-list {
  padding-left: 18px;
  margin: 18px 0 0;
  color: #475569;
  line-height: 1.7;
}

.purchase-sidebar-card {
  position: sticky;
  top: 24px;
}

.purchase-sidebar-card__header,
.purchase-content-card__header,
.purchase-state-card__header {
  margin-bottom: 20px;
}

.purchase-sidebar-card__header p,
.purchase-content-card__header p,
.purchase-state-card__header p {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.purchase-progress-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.8);
  color: #475569;
}

.purchase-progress-item__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #cbd5e1;
}

.purchase-progress-item.is-active {
  background: #fef3c7;
  color: #92400e;
}

.purchase-progress-item.is-active .purchase-progress-item__dot {
  background: #f59e0b;
}

.purchase-progress-item.is-complete {
  background: #dcfce7;
  color: #166534;
}

.purchase-progress-item.is-complete .purchase-progress-item__dot {
  background: #16a34a;
}

.purchase-sidebar-card__meta {
  margin: 20px 0;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.24);
}

.purchase-sidebar-card__meta p {
  margin: 0 0 10px;
  color: #475569;
}

.purchase-step-chip {
  padding: 10px 12px;
  border-radius: 999px;
  background: #172033;
  color: white;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.purchase-content-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
}

.purchase-feedback {
  margin: 0 0 16px;
  padding: 14px 16px;
  border-radius: 14px;
  font-weight: 500;
}

.purchase-feedback--error {
  background: #fee2e2;
  color: #991b1b;
}

.purchase-feedback--success {
  background: #dcfce7;
  color: #166534;
}

.purchase-form,
.purchase-form-grid,
.purchase-section-stack {
  display: grid;
  gap: 16px;
}

.purchase-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.purchase-field {
  display: grid;
  gap: 8px;
}

.purchase-field span {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

.purchase-field input,
.purchase-field textarea,
.purchase-field select {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 14px;
  background: white;
  padding: 14px 15px;
  font-size: 0.98rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.purchase-field input:focus,
.purchase-field textarea:focus,
.purchase-field select:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.purchase-field--full {
  grid-column: 1 / -1;
}

.purchase-field--compact span {
  font-size: 0.82rem;
}

.purchase-form-actions {
  padding-top: 8px;
}

.purchase-button {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 14px 22px;
  font-size: 0.96rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  background: #e2e8f0;
  color: #172033;
}

.purchase-button:hover {
  transform: translateY(-1px);
}

.purchase-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.purchase-button--primary {
  background: linear-gradient(135deg, #0f766e, #166534);
  color: white;
  box-shadow: 0 20px 30px rgba(15, 118, 110, 0.18);
}

.purchase-button--ghost {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.purchase-inline-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  text-decoration: none;
  color: #0f766e;
}

.purchase-inline-link--block {
  width: fit-content;
}

.purchase-otp-box,
.purchase-callout,
.purchase-summary-card,
.purchase-doc-card,
.purchase-simulation-card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.86);
}

.purchase-otp-box,
.purchase-callout,
.purchase-doc-card,
.purchase-simulation-card {
  padding: 18px;
}

.purchase-callout h3,
.purchase-simulation-card h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}

.purchase-callout p,
.purchase-simulation-card p,
.purchase-doc-card__status {
  margin: 0;
  line-height: 1.6;
  color: #475569;
}

.purchase-callout--success {
  background: linear-gradient(135deg, #dcfce7, #ecfccb);
}

.purchase-doc-grid,
.purchase-summary-grid,
.purchase-simulation-list {
  display: grid;
  gap: 16px;
}

.purchase-doc-grid,
.purchase-summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.purchase-doc-card {
  display: grid;
  gap: 14px;
}

.purchase-doc-card__title {
  margin: 0 0 4px;
  font-weight: 700;
}

.purchase-doc-card__status.is-ready {
  color: #166534;
}

.purchase-doc-card__status.is-pending {
  color: #b45309;
}

.purchase-file-input {
  width: 100%;
}

.purchase-simulation-card__header {
  margin-bottom: 14px;
}

.purchase-simulation-option {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  background: white;
  margin-top: 10px;
  cursor: pointer;
}

.purchase-simulation-option.is-selected {
  outline: 2px solid rgba(15, 118, 110, 0.28);
}

.purchase-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.6;
  color: #334155;
}

.purchase-summary-card {
  padding: 18px;
}

.purchase-summary-card span {
  display: block;
  margin-bottom: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.purchase-summary-card strong {
  font-size: 1.02rem;
}

.purchase-spinner {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 4px solid rgba(148, 163, 184, 0.25);
  border-top-color: #0f766e;
  animation: purchase-spin 0.9s linear infinite;
}

@keyframes purchase-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .purchase-hero__content,
  .purchase-auth-grid,
  .purchase-flow-grid {
    grid-template-columns: 1fr;
  }

  .purchase-sidebar-card {
    position: static;
  }
}

@media (max-width: 720px) {
  .purchase-hero {
    padding-top: 72px;
  }

  .purchase-delivery-grid {
    grid-template-columns: 1fr;
  }

  .purchase-shell {
    width: min(100% - 20px, 1180px);
  }

  .purchase-state-card,
  .purchase-sidebar-card,
  .purchase-content-card,
  .purchase-reservation-card {
    padding: 20px;
    border-radius: 20px;
  }

  .purchase-content-card__header {
    flex-direction: column;
  }

  .purchase-form-grid,
  .purchase-doc-grid,
  .purchase-summary-grid {
    grid-template-columns: 1fr;
  }

  .purchase-simulation-option {
    grid-template-columns: auto 1fr;
  }

  .purchase-simulation-option strong {
    grid-column: 2;
  }
}
</style>