export function useMetricsFilters() {
  const { fetchApi } = useApi()
  const toast = useToast()

  const projects = ref<any[]>([])
  const selectedProjectId = ref('all')
  const startDate = ref(getDaysAgoInBrasilia(30))
  const endDate = ref(getTodayInBrasilia())

  async function fetchProjects() {
    try {
      const res = await fetchApi('/projects?limit=100')
      projects.value = res.data
    } catch {
      toast.error('Erro ao carregar projetos')
    }
  }

  function buildQueryString(): string {
    const params = new URLSearchParams({
      projectId: selectedProjectId.value,
      startDate: startDate.value || '',
      endDate: endDate.value || ''
    })
    return params.toString()
  }

  return {
    projects,
    selectedProjectId,
    startDate,
    endDate,
    fetchProjects,
    buildQueryString
  }
}
