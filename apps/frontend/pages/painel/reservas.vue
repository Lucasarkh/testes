<template>
  <div class="reservations-page">
    <div class="page-header">
      <div>
        <h1 class="text-white">Reservas</h1>
        <p>Escolha um projeto para abrir a central de reservas.</p>
      </div>
      <NuxtLink to="/painel/projetos" class="btn btn-secondary">Ver projetos</NuxtLink>
    </div>

    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="projects.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4"><i class="bi bi-journal-check" aria-hidden="true"></i></div>
        <h3 class="fw-bold mb-3">Nenhum projeto disponível</h3>
        <p class="mb-4 px-4">Crie ou publique um projeto para centralizar reservas, contratos e liberações.</p>
        <NuxtLink to="/painel/projetos" class="btn btn-primary">Ir para projetos</NuxtLink>
      </div>
    </div>

    <div v-else class="reservations-grid">
      <article v-for="project in projects" :key="project.id" class="reservations-card card">
        <div class="reservations-card__top">
          <div>
            <p class="reservations-card__eyebrow">Projeto</p>
            <h2>{{ project.name }}</h2>
            <p class="reservations-card__slug">/{{ project.slug }}</p>
          </div>
          <span class="badge" :class="project.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'">
            {{ project.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
          </span>
        </div>

        <p class="reservations-card__description">{{ project.description || 'Sem descrição cadastrada.' }}</p>

        <div class="reservations-card__stats">
          <div>
            <strong>{{ project._count?.leads || 0 }}</strong>
            <span>Leads</span>
          </div>
          <div>
            <strong>{{ project._count?.mapElements || 0 }}</strong>
            <span>Elementos</span>
          </div>
        </div>

        <div class="reservations-card__actions">
          <NuxtLink :to="`/painel/projetos/${project.id}/pos-reserva`" class="btn btn-primary">
            Abrir Reservas
          </NuxtLink>
          <NuxtLink :to="`/painel/projetos/${project.id}`" class="btn btn-secondary">
            Abrir Projeto
          </NuxtLink>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

type ReservationProject = {
  id: string
  name: string
  slug: string
  description?: string | null
  status?: string | null
  _count?: {
    leads?: number
    mapElements?: number
  } | null
}

const { fetchApi } = useApi()
const { fromError: toastFromError } = useToast()

const loading = ref(true)
const projects = ref<ReservationProject[]>([])

const loadProjects = async () => {
  loading.value = true
  try {
    const response = await fetchApi('/projects?page=1&limit=100')
    projects.value = response?.data || []
  } catch (error) {
    toastFromError(error, 'Erro ao carregar central de reservas')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadProjects()
})
</script>

<style scoped>
.reservations-page {
  --reservations-primary: #0071e3;
  --reservations-primary-hover: #0077ed;
  --reservations-surface: #ffffff;
  --reservations-surface-alt: #f5f5f7;
  --reservations-text: #1d1d1f;
  --reservations-muted: #86868b;
  --reservations-border: #d2d2d7;
  --reservations-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  font-family: var(--font-sans);
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  margin: 0 0 8px;
  color: var(--reservations-text);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.page-header p {
  margin: 0;
  max-width: 48ch;
  color: var(--reservations-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.page-header :deep(.btn) {
  min-height: 48px;
  padding: 0 22px;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
}

.reservations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.reservations-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--reservations-border);
  border-radius: 20px;
  background: var(--reservations-surface);
  box-shadow: var(--reservations-shadow);
  color: var(--reservations-text);
}

.reservations-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.reservations-card__eyebrow {
  margin: 0 0 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--reservations-muted);
}

.reservations-card h2 {
  margin: 0;
  color: var(--reservations-text);
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.reservations-card__slug {
  margin: 6px 0 0;
  color: var(--reservations-muted);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

.reservations-card__description {
  margin: 0;
  color: var(--reservations-muted);
  font-size: 0.9375rem;
  line-height: 1.7;
  min-height: 3em;
}

.reservations-card__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.reservations-card__stats div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--reservations-border);
  border-radius: 16px;
  background: var(--reservations-surface-alt);
}

.reservations-card__stats strong {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--reservations-text);
  letter-spacing: -0.03em;
}

.reservations-card__stats span {
  font-size: 0.75rem;
  color: var(--reservations-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.reservations-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: auto;
}

.reservations-card__actions :deep(.btn) {
  min-height: 48px;
  padding: 0 20px;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
}

.reservations-card :deep(.badge) {
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

@media (max-width: 640px) {
  .reservations-card {
    padding: 24px;
  }

  .reservations-card h2 {
    font-size: 1.25rem;
  }

  .reservations-card__actions :deep(.btn),
  .page-header :deep(.btn) {
    width: 100%;
    justify-content: center;
  }
}
</style>