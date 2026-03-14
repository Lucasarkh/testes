export const PANEL_ACCESS_LEVELS = ['none', 'read', 'write'] as const;

export type PanelAccessLevel = (typeof PANEL_ACCESS_LEVELS)[number];

export const PANEL_FEATURES = [
  'projects',
  'leads',
  'distribution',
  'scheduling',
  'agencies',
  'realtors',
  'payments',
  'campaigns',
  'ai',
  'signupLinks',
  'metrics',
  'users'
] as const;

export type PanelFeatureKey = (typeof PANEL_FEATURES)[number];

export type PanelPermissions = Record<PanelFeatureKey, PanelAccessLevel>;

type RoutePermissionMap = {
  prefix: string;
  feature: PanelFeatureKey;
};

export const PANEL_ROUTE_PERMISSION_MAP: RoutePermissionMap[] = [
  { prefix: '/agencies/invite-codes', feature: 'signupLinks' },
  { prefix: '/users', feature: 'users' },
  { prefix: '/lead-distribution', feature: 'distribution' },
  { prefix: '/admin/payment-config', feature: 'payments' },
  { prefix: '/campaigns', feature: 'campaigns' },
  { prefix: '/ai', feature: 'ai' },
  { prefix: '/tracking/metrics', feature: 'metrics' },
  { prefix: '/tracking/report', feature: 'metrics' },
  { prefix: '/tracking/stats', feature: 'metrics' },
  { prefix: '/agencies', feature: 'agencies' },
  { prefix: '/realtor-links', feature: 'realtors' },
  { prefix: '/leads', feature: 'leads' },
  { prefix: '/scheduling', feature: 'scheduling' },
  { prefix: '/nearby', feature: 'projects' },
  { prefix: '/projects', feature: 'projects' },
  { prefix: '/map-elements', feature: 'projects' },
  { prefix: '/plant-maps', feature: 'projects' },
  { prefix: '/plant-hotspots', feature: 'projects' },
  { prefix: '/panoramas', feature: 'projects' },
  { prefix: '/panorama-snapshots', feature: 'projects' },
  { prefix: '/panorama-beacons', feature: 'projects' }
];

const ACCESS_RANK: Record<PanelAccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2
};

export function buildPanelPermissions(level: PanelAccessLevel): PanelPermissions {
  return PANEL_FEATURES.reduce((acc, feature) => {
    acc[feature] = level;
    return acc;
  }, {} as PanelPermissions);
}

export const FULL_PANEL_PERMISSIONS = buildPanelPermissions('write');
export const EMPTY_PANEL_PERMISSIONS = buildPanelPermissions('none');

export function normalizePanelPermissions(
  input: unknown,
  fallback: PanelAccessLevel = 'none'
): PanelPermissions {
  const source =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  return PANEL_FEATURES.reduce((acc, feature) => {
    const raw = source[feature];
    acc[feature] = isPanelAccessLevel(raw) ? raw : fallback;
    return acc;
  }, {} as PanelPermissions);
}

export function hasAnyPanelPermission(permissions: PanelPermissions): boolean {
  return PANEL_FEATURES.some((feature) => permissions[feature] !== 'none');
}

export function hasPanelFeatureAccess(
  permissions: PanelPermissions,
  feature: PanelFeatureKey,
  required: Exclude<PanelAccessLevel, 'none'>
): boolean {
  return ACCESS_RANK[permissions[feature]] >= ACCESS_RANK[required];
}

export function resolvePanelFeatureFromPath(pathname: string): PanelFeatureKey | null {
  const normalizedPath = pathname.startsWith('/api')
    ? pathname.slice(4) || '/'
    : pathname;

  const match = PANEL_ROUTE_PERMISSION_MAP.find(({ prefix }) =>
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );

  return match?.feature ?? null;
}

function isPanelAccessLevel(value: unknown): value is PanelAccessLevel {
  return typeof value === 'string' && PANEL_ACCESS_LEVELS.includes(value as PanelAccessLevel);
}