<template>
  <div class="dashboard-sysadmin">
    <div class="page-header">
      <div>
        <h1>Dashboard Sistema</h1>
        <p>Visão geral de todos os clientes registrados</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <div v-else class="grid grid-cols-4">
      <div class="stat-card">
        <div class="stat-value">{{ globalMetrics.totalTenants }}</div>
        <div class="stat-label">Loteadoras Ativas</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ globalMetrics.totalProjects }}</div>
        <div class="stat-label">Projetos Totais</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ globalMetrics.totalBrokers }}</div>
        <div class="stat-label">Corretores</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ globalMetrics.totalLeads }}</div>
        <div class="stat-label">Leads Gerados</div>
      </div>
    </div>

    <div v-if="!loading" style="margin-top: 32px;">
      <h2 style="margin-bottom: 20px;">Top Loteadoras (Leads)</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Loteadora</th>
              <th>Projetos</th>
              <th>Corretores</th>
              <th>Leads Gerados</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in topTenants" :key="t.id">
              <td>{{ t.name }}</td>
              <td>{{ t.metrics.projects }}</td>
              <td>{{ t.metrics.brokers }}</td>
              <td>{{ t.metrics.leads }}</td>
              <td>
                <span class="badge" :class="t.isActive ? 'badge-success' : 'badge-error'">{{ t.isActive ? 'Ativa' : 'Desativada' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top: 16px; text-align: right;">
        <NuxtLink to="/painel/tenants" class="btn btn-outline">Ver Todas as Loteadoras</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const { fetchApi } = useApi()
const tenants = ref([])
const loading = ref(true)

async function loadData() {
  loading.value = true
  try {
    tenants.value = await fetchApi('/tenants')
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const globalMetrics = computed(() => {
  return tenants.value.reduce((acc, t) => {
    if (t.isActive) acc.totalTenants++
    acc.totalProjects += t.metrics.projects
    acc.totalBrokers += t.metrics.brokers
    acc.totalLeads += t.metrics.leads
    return acc
  }, { totalTenants: 0, totalProjects: 0, totalBrokers: 0, totalLeads: 0 })
})

const topTenants = computed(() => {
  return [...tenants.value].sort((a,b) => b.metrics.leads - a.metrics.leads).slice(0, 5)
})

onMounted(loadData)
</script>
