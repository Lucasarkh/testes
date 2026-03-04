<template>
  <div class="subscription-status">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner-border spinner-border-sm" role="status"></div>
      <span>Carregando assinatura...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-danger">
      <i class="fas fa-exclamation-triangle me-2"></i>
      {{ error }}
    </div>

    <!-- Content -->
    <div v-else-if="status" class="status-content">
      <!-- Billing Warning Banner -->
      <div
        v-if="isGracePeriod"
        class="alert alert-warning d-flex align-items-center"
      >
        <i class="fas fa-exclamation-triangle me-3 fs-4"></i>
        <div>
          <strong>Pagamento pendente</strong>
          <p class="mb-0 small">
            Regularize o pagamento até
            <strong>{{ gracePeriodFormatted }}</strong> para evitar o bloqueio.
          </p>
        </div>
      </div>

      <!-- Blocked Banner -->
      <div
        v-if="isBlocked"
        class="alert alert-danger d-flex align-items-center"
      >
        <i class="fas fa-ban me-3 fs-4"></i>
        <div>
          <strong>Acesso bloqueado por inadimplência</strong>
          <p class="mb-0 small">
            Entre em contato com o suporte para regularizar sua situação.
          </p>
        </div>
      </div>

      <!-- Summary Card -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-3 text-center border-end">
              <div class="text-muted small">Valor Mensal</div>
              <div class="fs-3 fw-bold text-primary">{{ totalFormatted }}</div>
            </div>
            <div class="col-md-3 text-center border-end">
              <div class="text-muted small">Próximo Vencimento</div>
              <div class="fs-5 fw-semibold">{{ nextDueDateFormatted }}</div>
            </div>
            <div class="col-md-3 text-center border-end">
              <div class="text-muted small">Status</div>
              <span :class="statusBadgeClass">{{ statusLabel }}</span>
            </div>
            <div class="col-md-3 text-center">
              <div class="text-muted small">Projetos</div>
              <div class="fs-5 fw-semibold">{{ status.activeProjectCount }} / {{ status.maxProjects }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Projects -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="fas fa-folder-open me-2"></i>Projetos Cobrados
          </h6>
          <span class="badge bg-primary">{{ (status.projects || []).length }} projeto(s)</span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>Projeto</th>
                  <th class="text-center">Tier</th>
                  <th class="text-end">Valor/mês</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="proj in (status.projects || [])" :key="proj.projectId">
                  <td>
                    <i class="fas fa-folder me-2"></i>
                    {{ proj.projectName }}
                  </td>
                  <td class="text-center">
                    <span v-if="proj.isFree" class="badge bg-success">Grátis</span>
                    <span v-else class="badge bg-primary">#{{ proj.tierNumber }}</span>
                  </td>
                  <td class="text-end">
                    <template v-if="proj.isFree">R$ 0,00</template>
                    <template v-else>{{ formatCents(proj.effectivePriceCents) }}</template>
                  </td>
                </tr>
                <tr v-if="!(status.projects || []).length">
                  <td colspan="3" class="text-center text-muted py-4">
                    Nenhum projeto cobrável
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="d-flex gap-2">
        <button class="btn btn-outline-primary" @click="openPortal">
          <i class="fas fa-credit-card me-2"></i>Gerenciar Pagamento
        </button>
        <button class="btn btn-outline-secondary" @click="fetchStatus">
          <i class="fas fa-sync-alt me-2"></i>Atualizar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBilling } from '~/composables/useBilling';

const {
  status,
  loading,
  error,
  fetchStatus,
  openPortal,
  totalFormatted,
  nextDueDateFormatted,
  isGracePeriod,
  isBlocked,
} = useBilling();

onMounted(() => {
  fetchStatus();
});

const gracePeriodFormatted = computed(() => {
  if (!status.value?.gracePeriodEnd) return '';
  return new Date(status.value.gracePeriodEnd).toLocaleDateString('pt-BR');
});

const statusLabel = computed(() => {
  if (!status.value) return '';
  const map: Record<string, string> = {
    OK: 'Em dia',
    GRACE_PERIOD: 'Pendente',
    INADIMPLENTE: 'Inadimplente',
    CANCELLED: 'Cancelado',
  };
  return map[status.value.billingStatus] || status.value.billingStatus;
});

const statusBadgeClass = computed(() => {
  if (!status.value) return 'badge bg-secondary';
  const map: Record<string, string> = {
    OK: 'badge bg-success fs-6',
    GRACE_PERIOD: 'badge bg-warning text-dark fs-6',
    INADIMPLENTE: 'badge bg-danger fs-6',
    CANCELLED: 'badge bg-dark fs-6',
  };
  return map[status.value.billingStatus] || 'badge bg-secondary fs-6';
});

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
</script>

<style scoped>
.subscription-status {
  max-width: 800px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  justify-content: center;
  color: #6c757d;
}

.status-content .card {
  border-radius: 12px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.status-content .card-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  border-radius: 12px 12px 0 0 !important;
}
</style>
