<template>
  <div class="purchase-admin-page">
    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadPage">Tentar novamente</button>
    </div>

    <template v-else>
      <div class="page-header purchase-admin-header">
        <div>
          <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm page-back-btn" style="margin-bottom: 8px;">
            <i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i>
            <span class="back-nav-label">Voltar ao Projeto</span>
          </NuxtLink>
          <h1>Fluxo Pos-Reserva</h1>
          <p>Configure exigencias, simulacoes, contratos e acompanhe a conversao da reserva em venda.</p>
        </div>

        <button class="btn btn-primary" :disabled="saving" @click="saveConfig">
          {{ saving ? 'Salvando...' : 'Salvar configuracao' }}
        </button>
      </div>

      <div class="purchase-admin-summary">
        <article class="purchase-admin-stat">
          <span>Reservas em fluxo</span>
          <strong>{{ metrics.summary.totalReservations }}</strong>
        </article>
        <article class="purchase-admin-stat">
          <span>Vendas confirmadas</span>
          <strong>{{ metrics.summary.totalSales }}</strong>
        </article>
        <article class="purchase-admin-stat">
          <span>Conversao</span>
          <strong>{{ metrics.summary.conversionRate }}%</strong>
        </article>
        <article class="purchase-admin-stat">
          <span>Fechamento medio</span>
          <strong>{{ metrics.summary.averageClosingHours }}h</strong>
        </article>
        <article class="purchase-admin-stat">
          <span>Contratos assinados</span>
          <strong>{{ metrics.summary.contractSignedRate }}%</strong>
        </article>
      </div>

      <div class="purchase-admin-grid">
        <section class="card purchase-admin-card">
          <div class="purchase-admin-card__header">
            <h2>Regras do fluxo</h2>
            <p>Defina quais campos e documentos sao obrigatorios e em quais estados civis o cadastro do conjugue sera exigido.</p>
          </div>

          <div class="purchase-admin-fieldset">
            <label class="purchase-admin-toggle">
              <input v-model="form.autoGenerateContract" type="checkbox" />
              <span>Gerar contrato automaticamente quando a etapa estiver liberada</span>
            </label>
          </div>

          <div class="purchase-admin-fieldset">
            <label class="purchase-admin-label">Provedor de assinatura</label>
            <select v-model="form.signatureProvider" class="form-input">
              <option value="MANUAL">Manual</option>
              <option value="DOCUSIGN">DocuSign</option>
              <option value="CLICKSIGN">Clicksign</option>
              <option value="ZAPSIGN">ZapSign</option>
            </select>
          </div>

          <div class="purchase-admin-fieldset">
            <div class="purchase-admin-card__header purchase-admin-card__header--compact">
              <h3>Campos obrigatorios</h3>
              <p>Esses campos aparecem no cadastro do titular.</p>
            </div>
            <div class="purchase-admin-check-grid">
              <label v-for="field in fieldOptions" :key="field.field" class="purchase-admin-check">
                <input v-model="field.required" type="checkbox" />
                <span>{{ field.label }}</span>
              </label>
            </div>
          </div>

          <div class="purchase-admin-fieldset">
            <div class="purchase-admin-card__header purchase-admin-card__header--compact">
              <h3>Documentos obrigatorios</h3>
              <p>O cliente so avanca para simulacao depois de enviar todos os itens marcados.</p>
            </div>
            <div class="purchase-admin-check-grid">
              <label v-for="doc in documentOptions" :key="doc.documentType" class="purchase-admin-check">
                <input v-model="doc.required" type="checkbox" />
                <span>{{ doc.label }}</span>
              </label>
            </div>
          </div>

          <div class="purchase-admin-fieldset">
            <div class="purchase-admin-card__header purchase-admin-card__header--compact">
              <h3>Estados civis que exigem conjugue</h3>
              <p>Use valores como CASADO e UNIAO_ESTAVEL.</p>
            </div>
            <div class="purchase-admin-tags">
              <span v-for="(status, index) in form.requireSpouseWhenMaritalStatus" :key="`${status}-${index}`" class="purchase-admin-tag">
                {{ status }}
                <button type="button" @click="removeSpouseStatus(index)">x</button>
              </span>
            </div>
            <div class="purchase-admin-inline-form">
              <input v-model="newSpouseStatus" class="form-input" placeholder="Digite um estado civil e pressione adicionar" @keydown.enter.prevent="addSpouseStatus" />
              <button class="btn btn-secondary" type="button" @click="addSpouseStatus">Adicionar</button>
            </div>
          </div>
        </section>

        <section class="card purchase-admin-card">
          <div class="purchase-admin-card__header">
            <h2>Tabelas de pagamento</h2>
            <p>Monte combinacoes comerciais por empreendimento com entrada minima, limite de parcelas e cenarios prontos para o cliente aprovar.</p>
          </div>

          <div class="purchase-admin-stack">
            <article v-for="(table, tableIndex) in form.paymentTables" :key="table.localId" class="purchase-admin-subcard">
              <div class="purchase-admin-subcard__header">
                <h3>{{ table.name || `Tabela ${tableIndex + 1}` }}</h3>
                <button class="btn btn-danger btn-sm" type="button" @click="removePaymentTable(tableIndex)">Remover</button>
              </div>

              <div class="purchase-admin-subgrid">
                <label class="purchase-admin-label-group">
                  <span>Nome</span>
                  <input v-model="table.name" class="form-input" placeholder="Tabela Comercial Prime" />
                </label>
                <label class="purchase-admin-label-group">
                  <span>Entrada minima (%)</span>
                  <input v-model.number="table.entryMinPercent" type="number" min="0" class="form-input" />
                </label>
                <label class="purchase-admin-label-group">
                  <span>Maximo de parcelas</span>
                  <input v-model.number="table.maxInstallments" type="number" min="1" class="form-input" />
                </label>
                <label class="purchase-admin-label-group">
                  <span>Indice de correcao</span>
                  <input v-model="table.correctionIndex" class="form-input" placeholder="INCC" />
                </label>
              </div>

              <div class="purchase-admin-conditions">
                <div class="purchase-admin-subcard__header purchase-admin-subcard__header--minor">
                  <h4>Cenarios da tabela</h4>
                  <button class="btn btn-secondary btn-sm" type="button" @click="addCondition(tableIndex)">Nova condicao</button>
                </div>

                <div v-for="(condition, conditionIndex) in table.conditions" :key="condition.localId" class="purchase-admin-condition-row">
                  <input v-model.number="condition.numberInstallments" type="number" min="1" class="form-input" placeholder="Parcelas" />
                  <input v-model.number="condition.entryAmount" type="number" min="0" class="form-input" placeholder="Entrada" />
                  <input v-model.number="condition.installmentAmount" type="number" min="0" class="form-input" placeholder="Valor da parcela" />
                  <input v-model.number="condition.totalAmount" type="number" min="0" class="form-input" placeholder="Total estimado" />
                  <button class="btn btn-danger btn-sm" type="button" @click="removeCondition(tableIndex, conditionIndex)">Excluir</button>
                </div>
              </div>
            </article>

            <button class="btn btn-secondary" type="button" @click="addPaymentTable">Adicionar tabela</button>
          </div>
        </section>

        <section class="card purchase-admin-card">
          <div class="purchase-admin-card__header">
            <h2>Templates de contrato</h2>
            <p>Use variaveis como &#123;&#123;cliente_nome&#125;&#125;, &#123;&#123;cliente_cpf&#125;&#125;, &#123;&#123;lote_numero&#125;&#125;, &#123;&#123;quadra&#125;&#125;, &#123;&#123;valor_total&#125;&#125;, &#123;&#123;entrada&#125;&#125; e &#123;&#123;parcelas&#125;&#125;.</p>
          </div>

          <div class="purchase-admin-stack">
            <article v-for="(template, templateIndex) in form.contractTemplates" :key="template.localId" class="purchase-admin-subcard">
              <div class="purchase-admin-subcard__header">
                <h3>{{ template.title || `Template ${templateIndex + 1}` }}</h3>
                <button class="btn btn-danger btn-sm" type="button" @click="removeTemplate(templateIndex)">Remover</button>
              </div>

              <label class="purchase-admin-label-group">
                <span>Titulo</span>
                <input v-model="template.title" class="form-input" placeholder="Contrato de compra e venda" />
              </label>
              <label class="purchase-admin-label-group">
                <span>Conteudo</span>
                <textarea v-model="template.contentTemplate" class="form-textarea" rows="8" placeholder="Escreva o texto base do contrato."></textarea>
              </label>
              <label class="purchase-admin-toggle">
                <input :checked="template.isActive" type="checkbox" @change="setTemplateActive(templateIndex)" />
                <span>Usar como template ativo</span>
              </label>
            </article>

            <button class="btn btn-secondary" type="button" @click="addTemplate">Adicionar template</button>
          </div>
        </section>

        <section class="card purchase-admin-card">
          <div class="purchase-admin-card__header">
            <h2>Abandono por etapa</h2>
            <p>Veja onde o cliente costuma parar antes da confirmacao da venda.</p>
          </div>

          <div v-if="metrics.abandonmentByStep?.length" class="purchase-admin-abandonment">
            <article v-for="item in metrics.abandonmentByStep" :key="item.step" class="purchase-admin-abandonment__item">
              <div>
                <strong>{{ item.step }}</strong>
                <p>{{ formatStepLabel(item.step) }}</p>
              </div>
              <span>{{ item.count }}</span>
            </article>
          </div>
          <p v-else class="purchase-admin-empty">Nenhum abandono registrado ainda.</p>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = route.params.id as string
const { get, put } = useApi()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const loading = ref(true)
const saving = ref(false)
const error = ref('')

const metrics = reactive({
  summary: {
    totalReservations: 0,
    totalSales: 0,
    conversionRate: 0,
    averageClosingHours: 0,
    contractSignedRate: 0,
  },
  abandonmentByStep: [] as Array<{ step: string; count: number }>,
})

const fieldCatalog = [
  { field: 'name', label: 'Nome completo' },
  { field: 'email', label: 'E-mail' },
  { field: 'phone', label: 'Telefone' },
  { field: 'cpf', label: 'CPF' },
  { field: 'rg', label: 'RG' },
  { field: 'maritalStatus', label: 'Estado civil' },
  { field: 'occupation', label: 'Profissao' },
  { field: 'monthlyIncome', label: 'Renda mensal' },
  { field: 'address', label: 'Endereco' },
  { field: 'addressCity', label: 'Cidade' },
  { field: 'addressState', label: 'Estado' },
  { field: 'addressZip', label: 'CEP' },
]

const documentCatalog = [
  { documentType: 'RG', label: 'RG' },
  { documentType: 'CPF', label: 'CPF' },
  { documentType: 'CNH', label: 'CNH' },
  { documentType: 'CERTIDAO_CASAMENTO', label: 'Certidao de casamento' },
  { documentType: 'COMPROVANTE_RENDA', label: 'Comprovante de renda' },
  { documentType: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de residencia' },
  { documentType: 'CONTRATO_SOCIAL', label: 'Contrato social' },
  { documentType: 'OUTROS', label: 'Outros' },
]

const fieldOptions = ref(fieldCatalog.map((item) => ({ ...item, required: false })))
const documentOptions = ref(documentCatalog.map((item) => ({ ...item, required: false })))
const newSpouseStatus = ref('')

const form = reactive({
  signatureProvider: 'MANUAL',
  autoGenerateContract: true,
  requireSpouseWhenMaritalStatus: ['CASADO', 'UNIAO_ESTAVEL'] as string[],
  paymentTables: [] as any[],
  contractTemplates: [] as any[],
})

function createCondition() {
  return {
    localId: crypto.randomUUID(),
    numberInstallments: 12,
    entryAmount: 0,
    installmentAmount: 0,
    totalAmount: 0,
  }
}

function createPaymentTable() {
  return {
    localId: crypto.randomUUID(),
    name: '',
    entryMinPercent: 10,
    maxInstallments: 12,
    correctionIndex: 'INCC',
    conditions: [createCondition()],
  }
}

function createTemplate() {
  return {
    localId: crypto.randomUUID(),
    title: '',
    contentTemplate: '',
    isActive: form.contractTemplates.length === 0,
  }
}

function hydrateConfig(config: any) {
  fieldOptions.value = fieldCatalog.map((item) => ({
    ...item,
    required: Boolean(config?.fieldRequirements?.find((field: any) => field.field === item.field && field.required)),
  }))
  documentOptions.value = documentCatalog.map((item) => ({
    ...item,
    required: Boolean(config?.documentRequirements?.find((doc: any) => doc.documentType === item.documentType && doc.required)),
  }))
  form.signatureProvider = String(config?.signatureProvider || 'MANUAL')
  form.autoGenerateContract = Boolean(config?.autoGenerateContract ?? true)
  form.requireSpouseWhenMaritalStatus = Array.isArray(config?.requireSpouseWhenMaritalStatus)
    ? [...config.requireSpouseWhenMaritalStatus]
    : ['CASADO', 'UNIAO_ESTAVEL']
  form.paymentTables = (config?.paymentTables || []).map((table: any) => ({
    localId: crypto.randomUUID(),
    name: table.name,
    entryMinPercent: Number(table.entryMinPercent || 0),
    maxInstallments: Number(table.maxInstallments || 0),
    correctionIndex: table.correctionIndex || '',
    conditions: (table.conditions || []).map((condition: any) => ({
      localId: crypto.randomUUID(),
      numberInstallments: Number(condition.numberInstallments || 0),
      entryAmount: Number(condition.entryAmount || 0),
      installmentAmount: Number(condition.installmentAmount || 0),
      totalAmount: Number(condition.totalAmount || 0),
    })),
  }))
  form.contractTemplates = (config?.contractTemplates || []).map((template: any) => ({
    localId: crypto.randomUUID(),
    title: template.title,
    contentTemplate: template.contentTemplate,
    isActive: Boolean(template.isActive),
  }))

  if (!form.paymentTables.length) addPaymentTable()
  if (!form.contractTemplates.length) addTemplate()
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try {
    const [configResponse, metricsResponse] = await Promise.all([
      get(`/purchase-flow/config/${projectId}`),
      get(`/purchase-flow/metrics?projectId=${projectId}`),
    ])

    hydrateConfig(configResponse)
    metrics.summary = metricsResponse.summary
    metrics.abandonmentByStep = metricsResponse.abandonmentByStep || []
  } catch (e: any) {
    error.value = e.message || 'Falha ao carregar configuracoes do fluxo.'
  } finally {
    loading.value = false
  }
}

function addSpouseStatus() {
  const normalized = newSpouseStatus.value.trim().toUpperCase()
  if (!normalized || form.requireSpouseWhenMaritalStatus.includes(normalized)) return
  form.requireSpouseWhenMaritalStatus.push(normalized)
  newSpouseStatus.value = ''
}

function removeSpouseStatus(index: number) {
  form.requireSpouseWhenMaritalStatus.splice(index, 1)
}

function addPaymentTable() {
  form.paymentTables.push(createPaymentTable())
}

function removePaymentTable(index: number) {
  form.paymentTables.splice(index, 1)
  if (!form.paymentTables.length) addPaymentTable()
}

function addCondition(tableIndex: number) {
  form.paymentTables[tableIndex].conditions.push(createCondition())
}

function removeCondition(tableIndex: number, conditionIndex: number) {
  const conditions = form.paymentTables[tableIndex].conditions
  conditions.splice(conditionIndex, 1)
  if (!conditions.length) conditions.push(createCondition())
}

function addTemplate() {
  form.contractTemplates.push(createTemplate())
}

function removeTemplate(index: number) {
  const wasActive = form.contractTemplates[index]?.isActive
  form.contractTemplates.splice(index, 1)
  if (!form.contractTemplates.length) {
    addTemplate()
    return
  }
  if (wasActive) {
    form.contractTemplates[0].isActive = true
  }
}

function setTemplateActive(activeIndex: number) {
  form.contractTemplates.forEach((template, index) => {
    template.isActive = index === activeIndex
  })
}

function buildPayload() {
  return {
    signatureProvider: form.signatureProvider,
    autoGenerateContract: form.autoGenerateContract,
    requireSpouseWhenMaritalStatus: form.requireSpouseWhenMaritalStatus,
    requiredFields: fieldOptions.value.map((field) => ({
      field: field.field,
      label: field.label,
      required: field.required,
    })),
    requiredDocuments: documentOptions.value.map((doc) => ({
      documentType: doc.documentType,
      required: doc.required,
    })),
    paymentTables: form.paymentTables
      .filter((table) => table.name.trim())
      .map((table) => ({
        name: table.name.trim(),
        entryMinPercent: Number(table.entryMinPercent || 0),
        maxInstallments: Number(table.maxInstallments || 0),
        correctionIndex: table.correctionIndex || 'INCC',
        conditions: table.conditions
          .filter((condition: any) => Number(condition.numberInstallments || 0) > 0)
          .map((condition: any) => ({
            numberInstallments: Number(condition.numberInstallments || 0),
            entryAmount: Number(condition.entryAmount || 0),
            installmentAmount: Number(condition.installmentAmount || 0),
            totalAmount: Number(condition.totalAmount || 0),
          })),
      })),
    contractTemplates: form.contractTemplates
      .filter((template) => template.title.trim() && template.contentTemplate.trim())
      .map((template) => ({
        title: template.title.trim(),
        contentTemplate: template.contentTemplate,
        isActive: template.isActive,
      })),
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const response = await put(`/purchase-flow/config/${projectId}`, buildPayload())
    hydrateConfig(response)
    toastSuccess('Configuracao do fluxo salva com sucesso.')
  } catch (e: any) {
    toastFromError(e, 'Falha ao salvar fluxo pos-reserva')
  } finally {
    saving.value = false
  }
}

function formatStepLabel(step: string) {
  return step
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

onMounted(() => {
  loadPage()
})

definePageMeta({
  layout: 'default',
})
</script>

<style scoped>
.purchase-admin-page {
  display: grid;
  gap: 24px;
}

.purchase-admin-header {
  border-bottom: 1px solid var(--glass-border-subtle);
  padding-bottom: 24px;
}

.purchase-admin-header h1 {
  margin: 0;
  font-size: 1.7rem;
}

.purchase-admin-header p {
  margin: 6px 0 0;
  color: var(--color-surface-400);
}

.purchase-admin-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.purchase-admin-stat {
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(18, 25, 38, 0.92), rgba(23, 33, 53, 0.88));
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.purchase-admin-stat span {
  display: block;
  margin-bottom: 8px;
  color: var(--color-surface-400);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.purchase-admin-stat strong {
  font-size: 1.9rem;
  color: var(--color-surface-50);
}

.purchase-admin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.purchase-admin-card {
  display: grid;
  gap: 20px;
}

.purchase-admin-card__header h2,
.purchase-admin-card__header h3,
.purchase-admin-card__header h4 {
  margin: 0;
}

.purchase-admin-card__header p {
  margin: 6px 0 0;
  color: var(--color-surface-400);
  line-height: 1.6;
}

.purchase-admin-card__header--compact p {
  margin-top: 4px;
  font-size: 0.9rem;
}

.purchase-admin-fieldset,
.purchase-admin-stack {
  display: grid;
  gap: 14px;
}

.purchase-admin-toggle,
.purchase-admin-check,
.purchase-admin-label-group {
  display: grid;
  gap: 8px;
  color: var(--color-surface-200);
}

.purchase-admin-toggle {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.purchase-admin-check-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.purchase-admin-check {
  grid-template-columns: auto 1fr;
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
}

.purchase-admin-label {
  color: var(--color-surface-300);
  font-weight: 600;
}

.purchase-admin-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.purchase-admin-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
  color: #86efac;
}

.purchase-admin-tag button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.purchase-admin-inline-form,
.purchase-admin-subgrid,
.purchase-admin-condition-row {
  display: grid;
  gap: 12px;
}

.purchase-admin-inline-form {
  grid-template-columns: minmax(0, 1fr) auto;
}

.purchase-admin-subgrid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.purchase-admin-subcard {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.purchase-admin-subcard__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.purchase-admin-subcard__header--minor {
  margin-top: 6px;
}

.purchase-admin-conditions {
  display: grid;
  gap: 12px;
}

.purchase-admin-condition-row {
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
}

.purchase-admin-abandonment {
  display: grid;
  gap: 12px;
}

.purchase-admin-abandonment__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
}

.purchase-admin-abandonment__item p {
  margin: 4px 0 0;
  color: var(--color-surface-400);
}

.purchase-admin-abandonment__item span {
  font-size: 1.4rem;
  font-weight: 700;
}

.purchase-admin-empty {
  margin: 0;
  color: var(--color-surface-400);
}

@media (max-width: 1024px) {
  .purchase-admin-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .purchase-admin-check-grid,
  .purchase-admin-subgrid,
  .purchase-admin-condition-row,
  .purchase-admin-inline-form {
    grid-template-columns: 1fr;
  }
}
</style>