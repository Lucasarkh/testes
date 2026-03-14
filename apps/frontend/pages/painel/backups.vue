<template>
  <div class="backups-page">
    <div class="page-header">
      <div>
        <h1>Gerenciamento de Backups</h1>
        <p>Gerencie backups do banco de dados no AWS S3.</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button
          class="btn btn-ghost"
          :disabled="cleaningUp"
          @click="handleCleanup"
        >
          <i class="pi pi-trash mr-1"></i>
          {{ cleaningUp ? 'Limpando...' : 'Limpeza Manual' }}
        </button>
        <button
          class="btn btn-primary"
          :disabled="creating"
          @click="handleCreate"
        >
          <i class="pi pi-plus mr-1"></i>
          {{ creating ? 'Criando...' : 'Criar Backup Agora' }}
        </button>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>
      <div v-else-if="backups.length === 0" class="loading-state">
        <p style="color: var(--color-surface-400);">Nenhum backup encontrado.</p>
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Tamanho</th>
              <th>Arquivo</th>
              <th style="text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="backup in backups" :key="backup.key">
              <td>{{ formatDate(backup.lastModified) }}</td>
              <td>
                <span class="badge" :class="backup.label === 'manual' ? 'badge-info' : 'badge-success'">
                  {{ backup.label === 'manual' ? 'Manual' : 'Automático' }}
                </span>
              </td>
              <td>{{ formatSize(backup.size) }}</td>
              <td style="font-size: 0.8rem; color: var(--color-surface-400); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ backup.key.split('/').pop() }}
              </td>
              <td style="text-align: right;">
                <button
                  class="btn btn-sm btn-ghost"
                  style="color: #f59e0b;"
                  :disabled="restoring"
                  @click="confirmRestore(backup)"
                >
                  <i class="pi pi-replay mr-1"></i>
                  Restaurar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Restore Confirmation Modal -->
    <div v-if="showRestoreModal" class="modal-overlay">
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h2 style="color: #ef4444;">
            <i class="pi pi-exclamation-triangle mr-2"></i>
            Confirmar Restauração
          </h2>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="color: #fca5a5; font-weight: 600; margin-bottom: 8px;">
              ATENÇÃO: Esta operação é destrutiva!
            </p>
            <p style="color: var(--color-surface-300); font-size: 0.875rem;">
              A restauração irá sobrescrever TODOS os dados atuais do banco de dados com o conteúdo deste backup. Esta ação não pode ser desfeita.
            </p>
          </div>
          <p v-if="selectedBackup" style="color: var(--color-surface-300); font-size: 0.875rem;">
            <strong>Backup:</strong> {{ selectedBackup.key.split('/').pop() }}<br>
            <strong>Data:</strong> {{ formatDate(selectedBackup.lastModified) }}<br>
            <strong>Tamanho:</strong> {{ formatSize(selectedBackup.size) }}
          </p>
        </div>
        <div class="modal-footer" style="display: flex; gap: 8px; justify-content: flex-end; padding-top: 16px;">
          <button class="btn btn-ghost" @click="showRestoreModal = false">Cancelar</button>
          <button
            class="btn"
            style="background: #ef4444; color: #fff;"
            :disabled="restoring"
            @click="handleRestore"
          >
            {{ restoring ? 'Restaurando...' : 'Sim, Restaurar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const authStore = useAuthStore()
if (!authStore.isSysAdmin) {
  navigateTo(authStore.getDashboardRoute())
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const creating = ref(false)
const restoring = ref(false)
const cleaningUp = ref(false)
const backups = ref([])
const showRestoreModal = ref(false)
const selectedBackup = ref(null)

onMounted(async () => {
  await fetchBackups()
})

async function fetchBackups() {
  loading.value = true
  try {
    const data = await api.get('/backups')
    backups.value = data.backups || []
  } catch (e) {
    toast.error('Erro ao carregar backups.')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  creating.value = true
  try {
    const result = await api.post('/backups')
    if (result.success) {
      toast.success('Backup criado com sucesso!')
      await fetchBackups()
    } else {
      toast.error(`Erro ao criar backup: ${result.error || 'Erro desconhecido'}`)
    }
  } catch (e) {
    toast.error('Erro ao criar backup.')
  } finally {
    creating.value = false
  }
}

function confirmRestore(backup) {
  selectedBackup.value = backup
  showRestoreModal.value = true
}

async function handleRestore() {
  if (!selectedBackup.value) return
  restoring.value = true
  try {
    const result = await api.post('/backups/restore', { key: selectedBackup.value.key })
    if (result.success) {
      toast.success('Backup restaurado com sucesso!')
      showRestoreModal.value = false
    } else {
      toast.error(`Erro ao restaurar: ${result.error || 'Erro desconhecido'}`)
    }
  } catch (e) {
    toast.error('Erro ao restaurar backup.')
  } finally {
    restoring.value = false
  }
}

async function handleCleanup() {
  cleaningUp.value = true
  try {
    const result = await api.post('/backups/cleanup')
    toast.success(`Limpeza concluída: ${result.deleted || 0} backup(s) removido(s).`)
    await fetchBackups()
  } catch (e) {
    toast.error('Erro ao executar limpeza.')
  } finally {
    cleaningUp.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatSize(bytes) {
  if (!bytes) return '-'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  const kb = bytes / 1024
  return `${kb.toFixed(1)} KB`
}
</script>
