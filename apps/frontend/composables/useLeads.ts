import { computed, ref } from 'vue';

type LeadFilters = Record<string, string | number | null | undefined>;
type LeadStatusValue = string;
type LeadRecord = Record<string, any> & { id?: string };
type PreLaunchQueueFilters = Record<string, string | number | null | undefined>;
type PreLaunchQueueStatusValue = 'ACTIVE' | 'CONTACTED' | 'CONVERTED' | 'REMOVED';
type PreLaunchQueueRecord = Record<string, any> & { id?: string };

export const useLeads = () => {
  const { fetchApi } = useApi();
  const { fromError, success } = useToast();
  const authStore = useAuthStore();

  const loading = ref(false);
  const queueLoading = ref(false);
  const leads = ref<LeadRecord[]>([]);
  const meta = ref({ totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 });
  const preLaunchQueue = ref<PreLaunchQueueRecord[]>([]);
  const preLaunchQueueMeta = ref({ totalItems: 0, itemCount: 0, itemsPerPage: 12, totalPages: 0, currentPage: 1 });
  const preLaunchQueueSummary = ref({ active: 0, contacted: 0, converted: 0, removed: 0 });
  const preLaunchProjectBuckets = ref<Array<Record<string, any>>>([]);
  const preLaunchLotBuckets = ref<Array<Record<string, any>>>([]);
  const selectedLead = ref<LeadRecord | null>(null);
  const projects = ref<any[]>([]);
  const canLoadProjectsCatalog = computed(() => {
    if (!authStore.isLoteadora || !authStore.hasPanelRestrictions) {
      return true;
    }

    return authStore.canReadFeature('projects');
  });

  const loadProjects = async () => {
    if (!canLoadProjectsCatalog.value) {
      projects.value = [];
      return;
    }

    try {
      const res = await fetchApi('/projects?limit=100');
      projects.value = res.data || [];
    } catch (e) {
      fromError(e, 'Erro ao carregar projetos');
    }
  };

  const loadLeads = async (filters: LeadFilters = {}, page = 1) => {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') params.set(key, String(val));
      });
      params.set('page', String(page));
      params.set('limit', '12');
      const res = await fetchApi(`/leads?${params.toString()}`);
      leads.value = res.data;
      meta.value = res.meta;
    } catch (e) {
      fromError(e, 'Erro ao carregar leads');
    } finally {
      loading.value = false;
    }
  };

  const getLead = async (id: string) => {
    try {
      const lead = await fetchApi(`/leads/${id}`);
      selectedLead.value = lead;
      return lead;
    } catch (e) {
      fromError(e, 'Erro ao carregar detalhes do lead');
    }
  };

  const loadPreLaunchQueue = async (filters: PreLaunchQueueFilters = {}, page = 1) => {
    queueLoading.value = true;
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') params.set(key, String(val));
      });
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetchApi(`/leads/prelaunch-queue?${params.toString()}`);
      preLaunchQueue.value = res.data || [];
      preLaunchQueueMeta.value = res.meta || preLaunchQueueMeta.value;
      preLaunchQueueSummary.value = res.summary || preLaunchQueueSummary.value;
      preLaunchProjectBuckets.value = res.projectBuckets || [];
      preLaunchLotBuckets.value = res.lotBuckets || [];
    } catch (e) {
      fromError(e, 'Erro ao carregar fila de pré-lançamento');
    } finally {
      queueLoading.value = false;
    }
  };

  const updatePreLaunchQueueEntry = async (
    id: string,
    data: { status?: PreLaunchQueueStatusValue; notes?: string }
  ) => {
    try {
      const res = await fetchApi(`/leads/prelaunch-queue/${id}`, {
        method: 'PATCH',
        body: data
      });
      success('Fila de pré-lançamento atualizada');
      return res;
    } catch (e) {
      fromError(e, 'Erro ao atualizar fila de pré-lançamento');
      throw e;
    }
  };

  const createLead = async (data: Record<string, any>) => {
    try {
      const res = await fetchApi('/leads', { method: 'POST', body: data });
      success('Lead cadastrado com sucesso');
      return res;
    } catch (e) {
      fromError(e, 'Erro ao cadastrar lead');
      throw e;
    }
  };

  const updateLead = async (id: string, data: Record<string, any>) => {
    try {
      const res = await fetchApi(`/leads/${id}`, { method: 'PATCH', body: data });
      success('Lead atualizado com sucesso');
      if (selectedLead.value?.id === id) selectedLead.value = res;
      return res;
    } catch (e) {
      fromError(e, 'Erro ao atualizar lead');
      throw e;
    }
  };

  const updateLeadStatus = async (id: string, status: LeadStatusValue, notes = '') => {
    try {
      const updated = await fetchApi(`/leads/${id}/status`, {
        method: 'PATCH',
        body: { status, notes }
      });
      success('Status atualizado');
      if (selectedLead.value?.id === id) selectedLead.value = updated;
      return updated;
    } catch (e) {
      fromError(e, 'Erro ao atualizar status');
      throw e;
    }
  };

  const addDocument = async (leadId: string, doc: Record<string, any>) => {
    try {
      await fetchApi(`/leads/${leadId}/documents`, { method: 'POST', body: doc });
      success('Documento anexado');
      return getLead(leadId);
    } catch (e) {
      fromError(e, 'Erro ao anexar documento');
    }
  };

  const addPayment = async (leadId: string, payment: Record<string, any>) => {
    try {
      await fetchApi(`/leads/${leadId}/payments`, { method: 'POST', body: payment });
      success('Pagamento adicionado');
      return getLead(leadId);
    } catch (e) {
      fromError(e, 'Erro ao adicionar pagamento');
    }
  };

  return {
    loading, queueLoading, leads, meta, selectedLead, projects,
    preLaunchQueue, preLaunchQueueMeta, preLaunchQueueSummary, preLaunchProjectBuckets, preLaunchLotBuckets,
    loadProjects, loadLeads, loadPreLaunchQueue, getLead, createLead, updateLead, updateLeadStatus,
    updatePreLaunchQueueEntry, addDocument, addPayment
  };
};
