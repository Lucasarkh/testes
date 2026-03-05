import { useApi } from '../useApi'
import { usePublicApi } from '../usePublicApi'
import type {
  PlantMap,
  PlantHotspot,
  CreatePlantMapPayload,
  UpdatePlantMapPayload,
  CreateHotspotPayload,
  UpdateHotspotPayload,
} from './types'

// ─── Admin composable (authenticated) ─────────────────────

export const usePlantMapApi = () => {
  const { fetchApi, uploadApi } = useApi()

  /** GET admin plant map for a project */
  const getPlantMap = (projectId: string): Promise<PlantMap | null> =>
    fetchApi(`/projects/${projectId}/plant-map`)

  /** POST create plant map */
  const createPlantMap = (
    projectId: string,
    payload: CreatePlantMapPayload,
  ): Promise<PlantMap> =>
    fetchApi(`/projects/${projectId}/plant-map`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

  /** PUT update plant map settings */
  const updatePlantMap = (
    plantMapId: string,
    payload: UpdatePlantMapPayload,
  ): Promise<PlantMap> =>
    fetchApi(`/plant-maps/${plantMapId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

  /** DELETE plant map */
  const deletePlantMap = (plantMapId: string): Promise<void> =>
    fetchApi(`/plant-maps/${plantMapId}`, { method: 'DELETE' })

  /** Upload image → returns { imageUrl } */
  const uploadPlantImage = async (
    projectId: string,
    file: File,
  ): Promise<{ imageUrl: string }> => {
    const form = new FormData()
    form.append('file', file)
    return uploadApi(`/projects/${projectId}/plant-map/upload-image`, form)
  }

  /** POST create hotspot */
  const createHotspot = (
    plantMapId: string,
    payload: CreateHotspotPayload,
  ) =>
    fetchApi(`/plant-maps/${plantMapId}/hotspots`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

  /** POST create multiple hotspots in a single transaction (no throttle) */
  const createHotspotsBulk = (
    plantMapId: string,
    payloads: CreateHotspotPayload[],
  ): Promise<PlantHotspot[]> =>
    fetchApi(`/plant-maps/${plantMapId}/hotspots/bulk`, {
      method: 'POST',
      body: JSON.stringify({ hotspots: payloads }),
    })

  /** PUT update hotspot */
  const updateHotspot = (hotspotId: string, payload: UpdateHotspotPayload) =>
    fetchApi(`/plant-hotspots/${hotspotId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

  /** DELETE hotspot */
  const deleteHotspot = (hotspotId: string): Promise<void> =>
    fetchApi(`/plant-hotspots/${hotspotId}`, { method: 'DELETE' })

  return {
    getPlantMap,
    createPlantMap,
    updatePlantMap,
    deletePlantMap,
    uploadPlantImage,
    createHotspot,
    createHotspotsBulk,
    updateHotspot,
    deleteHotspot,
  }
}

// ─── Public composable (no auth) ──────────────────────────

export const usePublicPlantMap = () => {
  const { fetchPublic } = usePublicApi()

  /** GET public plant map for a project (hotspots without description/metaJson — see getPublicHotspot) */
  const getPublicPlantMap = (projectId: string, preview = false): Promise<PlantMap | null> =>
    fetchPublic(`/p/projects/${projectId}/plant-map${preview ? '?preview=true' : ''}`)

  /** Lazy-load description + metaJson for a single hotspot (called only when user opens the popover) */
  const getPublicHotspot = (projectId: string, hotspotId: string): Promise<{ id: string; description: string | null; metaJson: any } | null> =>
    fetchPublic(`/p/projects/${projectId}/plant-map/hotspots/${hotspotId}`)

  return { getPublicPlantMap, getPublicHotspot }
}
