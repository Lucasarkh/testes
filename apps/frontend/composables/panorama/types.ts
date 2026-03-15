// ─── Panorama 360 Types ──────────────────────────────────

export interface PanoramaBeacon {
  id: string
  tenantId: string
  panoramaId: string
  title: string
  description?: string | null
  x: number // normalised 0..1
  y: number // normalised 0..1
  style: BeaconStyle
  visible: boolean
  createdAt: string
  updatedAt: string
}

export interface PanoramaSnapshot {
  id: string
  panoramaId: string
  imageUrl: string
  imageWidth?: number | null
  imageHeight?: number | null
  label: string // "Novembro/25"
  date?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type PanoramaProjection = 'FLAT' | 'EQUIRECTANGULAR'

export interface Panorama {
  id: string
  tenantId: string
  projectId: string
  title: string
  projection: PanoramaProjection
  published: boolean
  sunPathAngleDeg: number
  sunPathLabelEnabled: boolean
  showImplantation: boolean
  implantationUrl?: string | null
  snapshots: PanoramaSnapshot[]
  beacons: PanoramaBeacon[]
  createdAt: string
  updatedAt: string
}

// ─── Beacon Styles ───────────────────────────────────────

export type BeaconStyle = 'default' | 'highlight' | 'subtle'

export const BEACON_STYLE_OPTIONS: { value: BeaconStyle; label: string; color: string }[] = [
  { value: 'default', label: 'Padrão', color: '#3b5c3f' },
  { value: 'highlight', label: 'Destaque', color: '#b8860b' },
  { value: 'subtle', label: 'Discreto', color: 'rgba(255,255,255,0.7)' },
]

export function beaconStyleColor(style: BeaconStyle): string {
  return BEACON_STYLE_OPTIONS.find((o) => o.value === style)?.color ?? '#3b5c3f'
}

// ─── DTOs / Payloads ─────────────────────────────────────

export interface CreatePanoramaPayload {
  title?: string
  projection?: PanoramaProjection
  sunPathAngleDeg?: number
  sunPathLabelEnabled?: boolean
  showImplantation?: boolean
  implantationUrl?: string
}

export interface UpdatePanoramaPayload {
  title?: string
  projection?: PanoramaProjection
  published?: boolean
  sunPathAngleDeg?: number
  sunPathLabelEnabled?: boolean
  showImplantation?: boolean
  implantationUrl?: string
}

export interface CreateSnapshotPayload {
  imageUrl: string
  imageWidth?: number
  imageHeight?: number
  label: string
  date?: string
  sortOrder?: number
}

export interface UpdateSnapshotPayload {
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
  label?: string
  date?: string
  sortOrder?: number
}

export interface CreateBeaconPayload {
  title: string
  description?: string
  x: number
  y: number
  style?: BeaconStyle
  visible?: boolean
}

export interface UpdateBeaconPayload {
  title?: string
  description?: string
  x?: number
  y?: number
  style?: BeaconStyle
  visible?: boolean
}
