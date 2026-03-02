<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Projetos</h1>
        <p>Gerencie seus loteamentos</p>
      </div>
      <button v-if="authStore.canEdit" class="btn btn-primary" @click="showCreate = true">+ Novo Projeto</button>
    </div>

    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="projects.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4">📂</div>
        <h3 class="fw-bold mb-3">Nenhum projeto ainda</h3>
        <p class="mb-4 px-4">Crie seu primeiro loteamento para começar a gerenciar unidades e leads.</p>
      </div>
    </div>

    <div v-else class="grid grid-cols-3">
      <ProjectCard 
        v-for="p in projects" 
        :key="p.id" 
        :project="p" 
        :show-date="true"
        @click="$router.push(`/painel/projetos/${p.id}`)"
      />
    </div>

    <CommonPagination :meta="meta" @change="loadProjects" />

    <!-- Create modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-title">Novo Projeto</div>
        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input v-model="form.name" class="form-input" placeholder="Residencial Parque dos Ipês" required />
          </div>
          <div class="form-group">
            <label class="form-label">Slug</label>
            <input v-model="form.slug" class="form-input" :class="{ 'input-error': slugTaken }" placeholder="parque-dos-ipes" required @input="onSlugInput" />
            <small v-if="slugTaken" style="color:var(--error-color); font-size:0.75rem">Este slug já está em uso!</small>
            <small v-else style="color:var(--color-surface-400); font-size:0.75rem">URL pública: /{{ form.slug || '...' }}</small>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea v-model="form.description" class="form-textarea" rows="3" placeholder="Descrição do loteamento..."></textarea>
          </div>
          <div v-if="createError" class="alert alert-error">{{ createError }}</div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showCreate = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="creating">{{ creating ? 'Criando...' : 'Criar' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
// Force refresh project list page
import { ref, watch, onMounted } from 'vue'

const { fetchApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()
const loading = ref(true)
const projects = ref([])
const meta = ref({
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 9,
  totalPages: 0,
  currentPage: 1
})
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const slugManuallyEdited = ref(false)
const slugTaken = ref(false)
const checkingSlug = ref(false)

const form = ref({ name: '', slug: '', description: '' })

let slugTimeout = null
watch(() => form.value.slug, (v) => {
  if (!v) {
    slugTaken.value = false
    return
  }
  // Simplified debounce
  clearTimeout(slugTimeout)
  slugTimeout = setTimeout(async () => {
    checkingSlug.value = true
    try {
      const { available } = await fetchApi(`/projects/check-slug/${v}`)
      slugTaken.value = !available
    } catch { slugTaken.value = false }
    finally { checkingSlug.value = false }
  }, 500)
})

watch(() => form.value.name, (v) => {
  if (!slugManuallyEdited.value) {
    form.value.slug = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
})

const onSlugInput = () => { slugManuallyEdited.value = true }

const formatDate = (d) => formatDateToBrasilia(d)

const loadProjects = async (page = 1) => {
  loading.value = true
  try {
    const res = await fetchApi(`/projects?page=${page}&limit=9`)
    projects.value = res.data
    meta.value = res.meta
  } catch (e) {
    toastFromError(e, 'Erro ao carregar projetos')
  }
  loading.value = false
}

const handleCreate = async () => {
  if (slugTaken.value) {
    createError.value = 'Este slug já está em uso!'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const p = await fetchApi('/projects', { method: 'POST', body: JSON.stringify(form.value) })
    projects.value.unshift(p)
    meta.value.totalItems++
    showCreate.value = false
    form.value = { name: '', slug: '', description: '' }
    slugManuallyEdited.value = false
    toastSuccess('Projeto criado com sucesso!')
  } catch (e) {
    createError.value = e.message
    toastFromError(e, 'Erro ao criar projeto')
  } finally {
    creating.value = false
  }
}

onMounted(() => loadProjects(1))
</script>

<style scoped>
</style>
