<template>
  <div class="dashboard-loteadora">
    <div class="page-header">
      <div>
        <h1>Dashboard Loteadora</h1>
        <p>Visão geral dos seus projetos e leads</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Carregando...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: 16px;" @click="loadDashboard">Tentar novamente</button>
    </div>

    <template v-else>
      <div class="grid grid-cols-4">
        <div class="stat-card">
          <div class="stat-value">{{ stats.projects }}</div>
          <CommonAppTooltip text="Total de empreendimentos cadastrados na plataforma." position="bottom"><div class="stat-label">Projetos</div></CommonAppTooltip>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.publishedProjects }}</div>
          <CommonAppTooltip text="Projetos que estão publicados e visíveis para o público." position="bottom"><div class="stat-label">Publicados</div></CommonAppTooltip>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalLots }}</div>
          <CommonAppTooltip text="Total de lotes e elementos desenhados nos mapas de todos os projetos." position="bottom"><div class="stat-label">Elementos no Mapa</div></CommonAppTooltip>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalLeads }}</div>
          <CommonAppTooltip text="Total de leads (contatos de interessados) captados em todos os projetos." position="bottom"><div class="stat-label">Leads</div></CommonAppTooltip>
        </div>
      </div>

      <div style="margin-top: 32px;">
        <h2 style="margin-bottom: 20px;">Projetos Recentes</h2>
        <div v-if="projects.length === 0" class="empty-state">
          <div class="empty-state-icon"><i class="bi bi-folder2-open" aria-hidden="true"></i></div>
          <h3>Nenhum projeto ainda</h3>
          <p>Crie seu primeiro projeto para começar</p>
          <NuxtLink to="/painel/projetos" class="btn btn-primary" style="margin-top: 16px;">
            Criar Projeto
          </NuxtLink>
        </div>
        <div v-else class="grid grid-cols-3">
          <ProjectCard 
            v-for="p in projects.slice(0, 6)" 
            :key="p.id" 
            :project="p" 
            @click="$router.push(`/painel/projetos/${p.id}`)"
          />
        </div>
      </div>

      <div v-if="recentLeads.length" style="margin-top: 32px;">
        <h2 style="margin-bottom: 20px;">Leads Recentes</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Projeto</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in recentLeads.slice(0, 5)" :key="l.id">
                <td>{{ l.name }}</td>
                <td>{{ l.email || '—' }}</td>
                <td>{{ l.phone || '—' }}</td>
                <td>{{ l.project?.name ?? '—' }}</td>
                <td><span class="badge" :class="leadBadge(l.status)">{{ leadLabel(l.status) }}</span></td>
                <td>{{ formatDate(l.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const { fetchApi } = useApi()
const loading = ref(true)
const error = ref('')
const projects = ref([])
const recentLeads = ref([])
const stats = ref({ projects: 0, publishedProjects: 0, totalLots: 0, totalLeads: 0 })

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [statsRes, projectsRes, leadsRes] = await Promise.all([
      fetchApi('/tracking/stats'),
      fetchApi('/projects'),
      fetchApi('/leads')
    ])
    stats.value = statsRes
    projects.value = projectsRes.data || projectsRes || []
    recentLeads.value = leadsRes.data || leadsRes || []
  } catch (err) {
    error.value = err.message || 'Erro ao carregar dashboard'
    console.error(err)
  } finally {
    loading.value = false
  }
}

function leadBadge(status) {
  const map = { NEW: 'badge-info', CONTACTED: 'badge-warning', QUALIFIED: 'badge-success', WON: 'badge-success', LOST: 'badge-error' }
  return map[status] || 'badge-neutral'
}

function leadLabel(status) {
  const map = { NEW: 'Novo', CONTACTED: 'Contatado', QUALIFIED: 'Qualificado', NEGOTIATING: 'Negociando', WON: 'Vendido', LOST: 'Perdido' }
  return map[status] || status
}

function formatDate(date) {
  return formatDateToBrasilia(date)
}

onMounted(loadDashboard)
</script>
