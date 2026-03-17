export const PANEL_ACCESS_LEVELS = ['none', 'read', 'write'] as const;

export type PanelAccessLevel = typeof PANEL_ACCESS_LEVELS[number];

export type PanelFeatureKey =
  | 'projects'
  | 'leads'
  | 'distribution'
  | 'scheduling'
  | 'agencies'
  | 'realtors'
  | 'payments'
  | 'campaigns'
  | 'ai'
  | 'signupLinks'
  | 'metrics'
  | 'users';

export type PanelPermissions = Partial<Record<PanelFeatureKey, PanelAccessLevel>>;

export const PANEL_FEATURES: Array<{
  key: PanelFeatureKey;
  label: string;
  description: string;
}> = [
  {
    key: 'projects',
    label: 'Projetos',
    description: 'Empreendimentos, planta, panorama, lotes e conteudo do projeto.',
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'Leads, funil comercial, documentos e historico do atendimento.',
  },
  {
    key: 'distribution',
    label: 'Distribuicao',
    description: 'Regras de distribuicao e roteamento de leads.',
  },
  {
    key: 'scheduling',
    label: 'Agendamentos',
    description: 'Agenda, regras e visitas comerciais.',
  },
  {
    key: 'agencies',
    label: 'Imobiliarias',
    description: 'Gestao das imobiliarias vinculadas a loteadora.',
  },
  {
    key: 'realtors',
    label: 'Corretores',
    description: 'Equipe comercial, corretores e seus vinculos.',
  },
  {
    key: 'payments',
    label: 'Pagamentos',
    description: 'Gateways, configuracoes e rotinas financeiras do painel.',
  },
  {
    key: 'campaigns',
    label: 'Campanhas',
    description: 'Campanhas, UTMs e desempenho de aquisicao.',
  },
  {
    key: 'ai',
    label: 'Assistente IA',
    description: 'Configuracoes e uso dos recursos de inteligencia artificial.',
  },
  {
    key: 'signupLinks',
    label: 'Links de cadastro',
    description: 'Links para onboarding de imobiliarias e corretores.',
  },
  {
    key: 'metrics',
    label: 'Metricas',
    description: 'Dashboards, historicos e relatorios de desempenho.',
  },
  {
    key: 'users',
    label: 'Usuarios',
    description: 'Usuarios internos que acessam o sistema da loteadora.',
  },
];

const PANEL_ACCESS_RANK: Record<PanelAccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const PANEL_ROUTE_FEATURE_MAP: Array<{ prefix: string; feature: PanelFeatureKey }> = [
  { prefix: '/painel/usuarios', feature: 'users' },
  { prefix: '/painel/links-cadastro', feature: 'signupLinks' },
  { prefix: '/painel/distribuicao', feature: 'distribution' },
  { prefix: '/painel/agendamentos', feature: 'scheduling' },
  { prefix: '/painel/imobiliarias', feature: 'agencies' },
  { prefix: '/painel/corretores', feature: 'realtors' },
  { prefix: '/painel/pagamentos', feature: 'payments' },
  { prefix: '/painel/campanhas', feature: 'campaigns' },
  { prefix: '/painel/ai', feature: 'ai' },
  { prefix: '/painel/metricas', feature: 'metrics' },
  { prefix: '/painel/leads', feature: 'leads' },
  { prefix: '/painel/reservas', feature: 'projects' },
  { prefix: '/painel/projetos', feature: 'projects' },
];

export const PANEL_FEATURE_DEFAULT_ROUTE: Record<PanelFeatureKey, string> = {
  projects: '/painel/projetos',
  leads: '/painel/leads',
  distribution: '/painel/distribuicao',
  scheduling: '/painel/agendamentos',
  agencies: '/painel/imobiliarias',
  realtors: '/painel/corretores',
  payments: '/painel/pagamentos',
  campaigns: '/painel/campanhas',
  ai: '/painel/ai',
  signupLinks: '/painel/links-cadastro',
  metrics: '/painel/metricas',
  users: '/painel/usuarios',
};

const isPanelAccessLevel = (value: unknown): value is PanelAccessLevel => {
  return typeof value === 'string' && PANEL_ACCESS_LEVELS.includes(value as PanelAccessLevel);
};

export const buildEmptyPanelPermissions = (): Record<PanelFeatureKey, PanelAccessLevel> => {
  return PANEL_FEATURES.reduce((acc, feature) => {
    acc[feature.key] = 'none';
    return acc;
  }, {} as Record<PanelFeatureKey, PanelAccessLevel>);
};

export const normalizePanelPermissions = (value: unknown): Record<PanelFeatureKey, PanelAccessLevel> => {
  const normalized = buildEmptyPanelPermissions();

  if (!value || typeof value !== 'object') {
    return normalized;
  }

  for (const feature of PANEL_FEATURES) {
    const currentValue = (value as Record<string, unknown>)[feature.key];
    if (isPanelAccessLevel(currentValue)) {
      normalized[feature.key] = currentValue;
    }
  }

  return normalized;
};

export const hasAssignedPanelPermission = (value: unknown): boolean => {
  const normalized = normalizePanelPermissions(value);
  return PANEL_FEATURES.some((feature) => normalized[feature.key] !== 'none');
};

export const hasPanelFeatureAccess = (
  value: unknown,
  feature: PanelFeatureKey,
  required: PanelAccessLevel = 'read',
): boolean => {
  const normalized = normalizePanelPermissions(value);
  return PANEL_ACCESS_RANK[normalized[feature]] >= PANEL_ACCESS_RANK[required];
};

export const countAssignedPanelFeatures = (value: unknown): number => {
  const normalized = normalizePanelPermissions(value);
  return PANEL_FEATURES.filter((feature) => normalized[feature.key] !== 'none').length;
};

export const resolvePanelFeatureFromPath = (path: string): PanelFeatureKey | null => {
  const match = PANEL_ROUTE_FEATURE_MAP.find((item) => path.startsWith(item.prefix));
  return match?.feature ?? null;
};