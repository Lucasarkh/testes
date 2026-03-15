export function useMetricsFilters() {
  const { fetchApi } = useApi()
  const toast = useToast()
  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  const projects = ref<any[]>([])
  const today = ref(getTodayInBrasilia())

  function getQueryValue(value: string | null | Array<string | null> | undefined) {
    if (Array.isArray(value)) return value.find((entry): entry is string => !!entry) || undefined
    return value ?? undefined
  }

  function isValidDateInput(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const parsed = new Date(`${value}T12:00:00`)
    return !Number.isNaN(parsed.getTime()) && getISODateInBrasilia(parsed) === value
  }

  function normalizeDate(value: string, fallback: string) {
    if (!isValidDateInput(value)) return fallback
    if (value > today.value) return today.value
    return value
  }

  function getNormalizedFiltersFromQuery() {
    const queryProjectId = getQueryValue(route.query.projectId)
    const queryStartDate = getQueryValue(route.query.startDate)
    const queryEndDate = getQueryValue(route.query.endDate)

    const defaultStartDate = getDaysAgoInBrasilia(30)
    const normalizedStart = normalizeDate(queryStartDate || defaultStartDate, defaultStartDate)
    const normalizedEnd = normalizeDate(queryEndDate || today.value, today.value)

    if (normalizedStart <= normalizedEnd) {
      return {
        projectId: queryProjectId || 'all',
        startDate: normalizedStart,
        endDate: normalizedEnd
      }
    }

    return {
      projectId: queryProjectId || 'all',
      startDate: normalizedEnd,
      endDate: normalizedStart
    }
  }

  const initialFilters = getNormalizedFiltersFromQuery()
  const selectedProjectId = ref(initialFilters.projectId)
  const startDate = ref(initialFilters.startDate)
  const endDate = ref(initialFilters.endDate)
  const canLoadProjectsCatalog = computed(() => {
    return !auth.isLoteadora || !auth.hasPanelRestrictions || auth.canReadFeature('projects')
  })

  const startDateMax = computed(() => {
    return endDate.value || today.value
  })

  const endDateMin = computed(() => {
    return startDate.value || undefined
  })

  const endDateMax = computed(() => today.value)

  function syncDateRange(changedField: 'start' | 'end' | 'manual' = 'manual', showFeedback = true) {
    const nextStart = normalizeDate(startDate.value, getDaysAgoInBrasilia(30))
    const nextEnd = normalizeDate(endDate.value, today.value)

    let finalStart = nextStart
    let finalEnd = nextEnd

    const hadInvalidOrFutureValues =
      nextStart !== startDate.value || nextEnd !== endDate.value

    if (finalStart > finalEnd) {
      if (changedField === 'start') {
        finalEnd = finalStart
      } else if (changedField === 'end') {
        finalStart = finalEnd
      } else {
        finalStart = nextEnd
        finalEnd = nextStart
      }

      if (showFeedback) {
        toast.warn('Intervalo ajustado automaticamente para manter uma faixa válida.')
      }
    } else if (hadInvalidOrFutureValues && showFeedback) {
      toast.info('Datas inválidas ou futuras foram ajustadas automaticamente.')
    }

    if (startDate.value !== finalStart) {
      startDate.value = finalStart
    }

    if (endDate.value !== finalEnd) {
      endDate.value = finalEnd
    }
  }

  function ensureSelectedProjectIsAvailable(showFeedback = false) {
    if (selectedProjectId.value === 'all') return
    if (projects.value.some(project => project.id === selectedProjectId.value)) return

    selectedProjectId.value = 'all'
    if (showFeedback) {
      toast.warn('O empreendimento selecionado não está disponível. O filtro foi redefinido.')
    }
  }

  async function fetchProjects() {
    if (!canLoadProjectsCatalog.value) {
      projects.value = []
      selectedProjectId.value = 'all'
      return
    }

    try {
      const res = await fetchApi('/projects?limit=100')
      projects.value = res.data
      ensureSelectedProjectIsAvailable()
    } catch {
      toast.error('Erro ao carregar projetos')
      projects.value = []
      selectedProjectId.value = 'all'
    }
  }

  function buildQueryString(): string {
    syncDateRange('manual', false)

    const params = new URLSearchParams({
      projectId: selectedProjectId.value,
      startDate: startDate.value || '',
      endDate: endDate.value || ''
    })
    return params.toString()
  }

  function syncFiltersQuery() {
    syncDateRange('manual', false)

    const currentProjectId = getQueryValue(route.query.projectId) || 'all'
    const currentStartDate = getQueryValue(route.query.startDate) || ''
    const currentEndDate = getQueryValue(route.query.endDate) || ''

    if (
      currentProjectId === selectedProjectId.value &&
      currentStartDate === startDate.value &&
      currentEndDate === endDate.value
    ) {
      return
    }

    router.replace({
      query: {
        ...route.query,
        projectId: selectedProjectId.value,
        startDate: startDate.value,
        endDate: endDate.value
      }
    })
  }

  watch(startDate, (next, prev) => {
    if (next === prev) return
    syncDateRange('start')
  })

  watch(endDate, (next, prev) => {
    if (next === prev) return
    syncDateRange('end')
  })

  watch([selectedProjectId, startDate, endDate], () => {
    syncFiltersQuery()
  }, { immediate: true })

  watch(() => [route.query.projectId, route.query.startDate, route.query.endDate], () => {
    const nextFilters = getNormalizedFiltersFromQuery()

    if (selectedProjectId.value !== nextFilters.projectId) {
      selectedProjectId.value = nextFilters.projectId
    }

    if (startDate.value !== nextFilters.startDate) {
      startDate.value = nextFilters.startDate
    }

    if (endDate.value !== nextFilters.endDate) {
      endDate.value = nextFilters.endDate
    }
  })

  return {
    projects,
    selectedProjectId,
    today,
    startDate,
    startDateMax,
    endDate,
    endDateMin,
    endDateMax,
    fetchProjects,
    buildQueryString,
    syncDateRange
  }
}
