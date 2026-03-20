<template>
  <div>
    <div class="page-header category-page-header">
      <div style="flex: 1;">
        <div class="flex items-center gap-2" style="margin-bottom: 4px;">
          <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm page-back-btn">
            <i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i>
            <span class="back-nav-label">{{ projectName || 'Projeto' }}</span>
          </NuxtLink>
        </div>
        <h1 class="category-page-title"><i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i> Categorias de Lote</h1>
        <p class="category-page-subtitle">Crie, edite e ilustre as categorias exibidas na página pública dedicada.</p>
      </div>

      <div class="category-header-actions">
        <a
          v-if="publicCategoriesUrl"
          :href="publicCategoriesUrl"
          target="_blank"
          class="category-public-link"
        >
          <i class="bi bi-globe2" aria-hidden="true"></i>
          <span>Ver página pública</span>
        </a>
      </div>
    </div>

    <div v-if="loading" class="loading-state category-page-loading">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="loadError" class="card category-page-error">
      {{ loadError }}
    </div>

    <div v-else class="category-page-layout" :class="{ 'is-readonly': isReadOnly }">
      <div v-if="isArchivedProject" class="alert alert-warning category-page-alert">
        Projeto arquivado em modo somente leitura. Publique o projeto para liberar edições.
      </div>

      <section class="category-create-card card">
        <div class="category-section-head">
          <div>
            <h2>Nova categoria</h2>
            <p>Use nome, descrição curta e imagem para formar os cards da página pública.</p>
          </div>
          <span class="category-section-chip">Organização visual e comercial</span>
        </div>

        <fieldset :disabled="isReadOnly || savingNewCategory" class="category-fieldset">
          <div class="category-create-grid">
            <label class="form-group">
              <span class="form-label">Nome</span>
              <input v-model="newCategory.name" class="form-input" maxlength="80" placeholder="Ex: Vista livre" />
            </label>
            <label class="form-group">
              <span class="form-label">Descrição curta</span>
              <input v-model="newCategory.description" class="form-input" maxlength="500" placeholder="Ex: lotes com melhor abertura visual do empreendimento." />
            </label>

            <div class="category-create-aside">
              <strong>Boas práticas</strong>
              <p>Use categorias objetivas. Elas aparecem como cards independentes para o cliente navegar antes de ver os lotes.</p>
            </div>
          </div>

          <div class="category-create-actions">
            <button class="category-primary-btn" type="button" @click="createCategory">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              {{ savingNewCategory ? 'Salvando...' : 'Criar categoria' }}
            </button>
          </div>
        </fieldset>
      </section>

      <section class="category-list-section">
        <div class="category-section-head">
          <div>
            <h2>Categorias cadastradas</h2>
            <p>{{ categories.length }} categoria<span v-if="categories.length !== 1">s</span> prontas para organização de lotes.</p>
          </div>
        </div>

        <div v-if="categories.length === 0" class="card category-empty-state">
          <div class="icon-blob mx-auto mb-4"><i class="bi bi-images" aria-hidden="true"></i></div>
          <h3>Nenhuma categoria criada</h3>
          <p>Cadastre a primeira categoria para separar grupos de lotes e publicar a vitrine de categorias.</p>
        </div>

        <div v-else class="category-grid">
          <article v-for="category in categories" :key="category.id" class="card category-card">
            <div class="category-card__preview-column">
              <div class="category-card__media" :class="{ 'has-image': !!category.imageUrl }">
                <img v-if="category.imageUrl" :src="category.imageUrl" :alt="`Imagem da categoria ${category.name}`" />
                <div v-else class="category-card__media-placeholder">
                  <i class="bi bi-image" aria-hidden="true"></i>
                  <span>Sem imagem</span>
                </div>
              </div>

              <div class="category-card__media-actions">
                <label v-if="!isReadOnly" class="category-media-btn category-upload-btn">
                  <i class="bi bi-upload" aria-hidden="true"></i>
                  <span>{{ category.isUploading ? 'Enviando...' : 'Enviar imagem' }}</span>
                  <input
                    :disabled="category.isUploading"
                    type="file"
                    accept="image/*"
                    class="category-file-input"
                    @change="uploadCategoryImage(category, $event)"
                  />
                </label>
                <button
                  v-if="!isReadOnly && category.imageUrl"
                  type="button"
                  class="category-media-btn category-media-btn--danger"
                  :disabled="category.isRemovingImage"
                  @click="removeCategoryImage(category)"
                >
                  <i class="bi bi-trash3" aria-hidden="true"></i>
                  <span>{{ category.isRemovingImage ? 'Removendo...' : 'Remover' }}</span>
                </button>
              </div>
            </div>

            <div class="category-card__body">
              <div class="category-card__topbar">
                <div>
                  <div class="category-card__title-row">
                    <h3>{{ category.name || 'Categoria sem nome' }}</h3>
                    <span class="category-slug">/{{ category.slug }}</span>
                  </div>
                  <div class="category-card__meta">
                    <span class="category-stat category-stat--success">{{ category.availableLots }} disponíveis</span>
                    <span class="category-stat">{{ category.totalLots }} no total</span>
                  </div>
                </div>

                <div class="category-card__actions">
                  <button
                    type="button"
                    class="category-primary-btn"
                    :disabled="isReadOnly || category.isSaving"
                    @click="saveCategory(category)"
                  >
                    <i class="bi bi-check2-circle" aria-hidden="true"></i>
                    {{ category.isSaving ? 'Salvando...' : 'Salvar' }}
                  </button>
                  <button
                    v-if="!isReadOnly"
                    type="button"
                    class="category-danger-btn"
                    :disabled="category.isDeleting"
                    @click="deleteCategory(category)"
                  >
                    <i class="bi bi-trash3" aria-hidden="true"></i>
                    {{ category.isDeleting ? 'Excluindo...' : 'Excluir' }}
                  </button>
                </div>
              </div>

              <div class="category-form-grid">
                <label class="form-group">
                  <span class="form-label">Nome</span>
                  <input v-model="category.name" class="form-input" maxlength="80" :disabled="isReadOnly || category.isSaving" />
                </label>
                <label class="form-group category-form-grid__wide">
                  <span class="form-label">Descrição</span>
                  <textarea
                    v-model="category.description"
                    class="form-input category-textarea"
                    maxlength="500"
                    rows="3"
                    :disabled="isReadOnly || category.isSaving"
                  ></textarea>
                </label>
              </div>

              <div class="category-card__footer-note">
                <i class="bi bi-info-circle" aria-hidden="true"></i>
                <span>O slug é gerado automaticamente a partir do nome e aparece na navegação pública.</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { useToast } from '~/composables/useToast'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })

type CategoryApiItem = {
  id: string
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  totalLots?: number
  availableLots?: number
}

type EditableCategory = {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string | null
  totalLots: number
  availableLots: number
  isSaving: boolean
  isDeleting: boolean
  isUploading: boolean
  isRemovingImage: boolean
}

const route = useRoute()
const projectId = String(route.params.id || '')

const { fetchApi, uploadApi } = useApi()
const toast = useToast()
const authStore = useAuthStore()

const loading = ref(true)
const loadError = ref<string | null>(null)
const projectName = ref('')
const projectStatus = ref('')
const projectSlug = ref('')
const categories = ref<EditableCategory[]>([])
const savingNewCategory = ref(false)
const newCategory = ref({ name: '', description: '' })

const isArchivedProject = computed(() => projectStatus.value === 'ARCHIVED')
const isReadOnly = computed(() => !authStore.canEdit || isArchivedProject.value)
const publicCategoriesUrl = computed(() => {
  const slug = String(projectSlug.value || '').trim()
  return slug ? `/${slug}/categorias` : ''
})

const normalizeCategories = (items: CategoryApiItem[] = []) => {
  categories.value = items.map((item) => ({
    id: item.id,
    name: String(item.name || ''),
    slug: String(item.slug || ''),
    description: String(item.description || ''),
    imageUrl: item.imageUrl || null,
    totalLots: Number(item.totalLots || 0),
    availableLots: Number(item.availableLots || 0),
    isSaving: false,
    isDeleting: false,
    isUploading: false,
    isRemovingImage: false,
  }))
}

const loadProject = async () => {
  const project = await fetchApi(`/projects/${projectId}`)
  projectName.value = String(project?.name || '')
  projectStatus.value = String(project?.status || '')
  projectSlug.value = String(project?.slug || '')
}

const loadCategories = async () => {
  const result = await fetchApi(`/projects/${projectId}/lots/categories`)
  normalizeCategories(result || [])
}

const refreshPageData = async () => {
  await Promise.all([loadProject(), loadCategories()])
}

const createCategory = async () => {
  if (isReadOnly.value) return

  const name = String(newCategory.value.name || '').trim()
  const description = String(newCategory.value.description || '').trim()
  if (!name) {
    toast.fromError(new Error('Informe o nome da categoria.'), 'Informe o nome da categoria.')
    return
  }

  savingNewCategory.value = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories`, {
      method: 'POST',
      body: {
        name,
        description: description || undefined,
      },
    })
    normalizeCategories(result || [])
    newCategory.value = { name: '', description: '' }
    toast.success('Categoria criada com sucesso.')
  } catch (error) {
    toast.fromError(error, 'Erro ao criar categoria')
  } finally {
    savingNewCategory.value = false
  }
}

const saveCategory = async (category: EditableCategory) => {
  if (isReadOnly.value) return

  const name = String(category.name || '').trim()
  const description = String(category.description || '').trim()
  if (!name) {
    toast.fromError(new Error('Informe o nome da categoria.'), 'Informe o nome da categoria.')
    return
  }

  category.isSaving = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories/${category.id}`, {
      method: 'PUT',
      body: {
        name,
        description: description || undefined,
      },
    })
    normalizeCategories(result || [])
    toast.success('Categoria atualizada.')
  } catch (error) {
    toast.fromError(error, 'Erro ao salvar categoria')
  } finally {
    category.isSaving = false
  }
}

const deleteCategory = async (category: EditableCategory) => {
  if (isReadOnly.value) return
  if (!confirm(`Excluir a categoria "${category.name}"? Os lotes vinculados ficarão sem categoria.`)) return

  category.isDeleting = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories/${category.id}`, {
      method: 'DELETE',
    })
    normalizeCategories(result || [])
    toast.success('Categoria removida.')
  } catch (error) {
    toast.fromError(error, 'Erro ao excluir categoria')
  } finally {
    category.isDeleting = false
  }
}

const uploadCategoryImage = async (category: EditableCategory, event: Event) => {
  if (isReadOnly.value) return

  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return

  category.isUploading = true
  try {
    const formData = new FormData()
    formData.append('file', file, file.name)
    const result = await uploadApi(`/projects/${projectId}/lots/categories/${category.id}/image`, formData)
    normalizeCategories(result || [])
    toast.success('Imagem da categoria atualizada.')
  } catch (error) {
    toast.fromError(error, 'Erro ao enviar imagem da categoria')
  } finally {
    category.isUploading = false
    if (input) input.value = ''
  }
}

const removeCategoryImage = async (category: EditableCategory) => {
  if (isReadOnly.value || !category.imageUrl) return

  category.isRemovingImage = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories/${category.id}/image`, {
      method: 'DELETE',
    })
    normalizeCategories(result || [])
    toast.success('Imagem removida.')
  } catch (error) {
    toast.fromError(error, 'Erro ao remover imagem da categoria')
  } finally {
    category.isRemovingImage = false
  }
}

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    await refreshPageData()
  } catch (error: any) {
    loadError.value = error?.message || 'Erro ao carregar categorias do projeto.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.category-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--glass-border-subtle);
  padding-bottom: 24px;
  margin-bottom: 24px;
}

.category-page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.category-page-subtitle {
  margin: 0;
  color: var(--color-surface-400);
  font-weight: 500;
}

.category-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-public-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.26);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(15, 23, 42, 0.94));
  color: #f8fafc;
  text-decoration: none;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.24);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.category-public-link:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.5);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(15, 23, 42, 0.98));
  box-shadow: 0 14px 32px rgba(2, 6, 23, 0.3);
}

.page-back-btn {
  padding: 6px 14px !important;
  border-radius: 12px;
  color: #d1d5db !important;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  text-decoration: none;
  font-weight: 700;
  transition: all 0.2s ease;
}

.page-back-btn:hover {
  color: #f8fafc !important;
  border-color: rgba(148, 163, 184, 0.7);
  background: rgba(15, 23, 42, 0.62);
}

.category-page-loading {
  height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-page-error {
  max-width: 520px;
  color: var(--color-danger);
}

.category-page-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.category-section-head h2 {
  margin: 0 0 4px;
}

.category-section-head p {
  margin: 0;
  color: var(--color-surface-400);
}

.category-section-chip {
  border-radius: 999px;
  padding: 8px 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.35);
  color: var(--color-surface-200);
  font-size: 0.82rem;
  white-space: nowrap;
}

.category-fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-inline-size: 0;
}

.category-create-card {
  padding: 22px;
}

.category-create-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(240px, 0.7fr);
  gap: 14px;
  align-items: start;
}

.category-create-aside {
  min-height: 100%;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.48), rgba(15, 23, 42, 0.22));
}

.category-create-aside strong {
  display: block;
  margin-bottom: 8px;
  color: #f8fafc;
}

.category-create-aside p {
  margin: 0;
  color: var(--color-surface-300);
  line-height: 1.5;
  font-size: 0.9rem;
}

.category-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.category-form-grid__wide {
  grid-column: 1 / -1;
}

.category-create-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.category-primary-btn,
.category-danger-btn,
.category-media-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  border: 0;
  border-radius: 12px;
  padding: 0 16px;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.category-primary-btn {
  background: linear-gradient(135deg, #059669, #34d399);
  color: #f8fafc;
  box-shadow: 0 10px 24px rgba(5, 150, 105, 0.22);
}

.category-primary-btn:hover:not(:disabled),
.category-danger-btn:hover:not(:disabled),
.category-media-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.category-danger-btn {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.category-media-btn {
  position: relative;
  width: 100%;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.category-media-btn--danger {
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.24);
  background: rgba(127, 29, 29, 0.22);
}

.category-primary-btn:disabled,
.category-danger-btn:disabled,
.category-media-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.category-empty-state {
  padding: 48px 24px;
  text-align: center;
}

.category-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-card {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(180deg, rgba(9, 16, 27, 0.94), rgba(8, 15, 23, 0.92));
  box-shadow: 0 18px 44px rgba(2, 6, 23, 0.22);
}

.category-card__preview-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-right: 1px solid rgba(148, 163, 184, 0.12);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.18));
}

.category-card__media {
  min-height: 180px;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.78));
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.category-card__media.has-image {
  background: #0f172a;
}

.category-card__media img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

.category-card__media-placeholder {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(226, 232, 240, 0.88);
}

.category-card__media-placeholder i {
  font-size: 2rem;
}

.category-card__media-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-upload-btn {
  position: relative;
  overflow: hidden;
}

.category-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.category-card__body {
  padding: 20px 22px;
}

.category-card__topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.category-card__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.category-card__title-row h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #f8fafc;
}

.category-card__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.category-slug,
.category-stat {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.76rem;
  background: rgba(148, 163, 184, 0.12);
  color: var(--color-surface-200);
}

.category-stat--success {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
}

.category-textarea {
  min-height: 110px;
  resize: vertical;
}

.category-card__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.category-card__footer-note {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-surface-400);
  font-size: 0.84rem;
}

@media (max-width: 900px) {
  .category-create-grid,
  .category-form-grid {
    grid-template-columns: 1fr;
  }

  .category-form-grid__wide {
    grid-column: auto;
  }

  .category-card {
    grid-template-columns: 1fr;
  }

  .category-card__preview-column {
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  }

  .category-card__topbar {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .page-back-btn {
    padding: 9px 14px !important;
    min-height: 38px;
    display: inline-flex;
    align-items: center;
  }

  .category-page-header {
    align-items: stretch;
  }

  .category-public-link {
    width: 100%;
    justify-content: center;
  }

  .category-card__media-actions,
  .category-card__actions,
  .category-create-actions {
    justify-content: stretch;
  }

  .category-card__media-actions > *,
  .category-card__actions > *,
  .category-create-actions > * {
    width: 100%;
  }
}
</style>