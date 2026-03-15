import { useTrackingStore } from '../stores/tracking';
import { usePublicApi } from './usePublicApi';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 15000;

type TrackingInitParams = {
  tenantId?: string;
  projectId?: string;
  tenantSlug?: string;
  projectSlug?: string;
  realtorCode?: string;
};

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lifecycleBound = false;
let activeInitParams: TrackingInitParams | null = null;
let ensureSessionPromise: Promise<boolean> | null = null;
let pingInFlight = false;

export const useTracking = () => {
  const store = useTrackingStore();
  const api = usePublicApi();
  const route = useRoute();

  const getTrackingUtms = () => {
    const query = route.query;

    return {
      utmSource: query.utm_source as string,
      utmMedium: query.utm_medium as string,
      utmCampaign: query.utm_campaign as string,
      utmContent: query.utm_content as string,
      utmTerm: query.utm_term as string,
      realtorCode: query.c as string,
    };
  };

  const mergeInitParams = (params?: Partial<TrackingInitParams>): TrackingInitParams | null => {
    const merged: TrackingInitParams = {
      ...(activeInitParams || {}),
      ...(params || {}),
    };

    if (!merged.projectSlug && store.currentProjectSlug) {
      merged.projectSlug = store.currentProjectSlug;
    }

    const hasContext = !!(
      merged.projectSlug
      || merged.projectId
      || merged.tenantSlug
      || merged.tenantId
    );

    return hasContext ? merged : null;
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const scheduleHeartbeat = () => {
    if (!import.meta.client) return;

    stopHeartbeat();

    if (!store.sessionId || document.visibilityState === 'hidden') {
      return;
    }

    heartbeatTimer = setInterval(() => {
      void pingSession(false);
    }, HEARTBEAT_INTERVAL_MS);
  };

  const pingSession = async (keepalive = false): Promise<boolean> => {
    if (!import.meta.client || !store.sessionId) return false;
    if (!keepalive && document.visibilityState === 'hidden') return false;
    if (pingInFlight) return true;

    pingInFlight = true;

    try {
      const response = await api.fetchPublic('/tracking/session/ping', {
        method: 'POST',
        body: JSON.stringify({ sessionId: store.sessionId }),
        keepalive,
      });

      store.touchSessionActivity(response?.lastSeenAt || new Date().toISOString());
      return true;
    } catch (error: any) {
      if (
        error?.status === 400
        || error?.status === 404
        || error?.status === 409
        || error?.data?.code === 'SESSION_EXPIRED'
      ) {
        store.clearSession();
      }

      return false;
    } finally {
      pingInFlight = false;
    }
  };

  const bindLifecycle = () => {
    if (!import.meta.client || lifecycleBound) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void ensureActiveSession();
        scheduleHeartbeat();
        return;
      }

      stopHeartbeat();
      void pingSession(true);
    };

    const handlePageHide = () => {
      stopHeartbeat();
      void pingSession(true);
    };

    const handleFocus = () => {
      void ensureActiveSession();
      scheduleHeartbeat();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('focus', handleFocus);
    lifecycleBound = true;
  };

  const ensureActiveSession = async (
    params?: Partial<TrackingInitParams>
  ): Promise<boolean> => {
    const mergedParams = mergeInitParams(params);

    if (store.hasActiveSession(SESSION_TIMEOUT_MS)) {
      scheduleHeartbeat();
      return true;
    }

    if (!mergedParams) {
      return false;
    }

    if (ensureSessionPromise) {
      return ensureSessionPromise;
    }

    ensureSessionPromise = initTracking(mergedParams).finally(() => {
      ensureSessionPromise = null;
    });

    return ensureSessionPromise;
  };

  const initTracking = async (params: { 
    tenantId?: string; 
    projectId?: string;
    tenantSlug?: string;
    projectSlug?: string;
    realtorCode?: string;
  }) => {
    activeInitParams = {
      ...(activeInitParams || {}),
      ...params,
    };

    const utmsFromRoute = getTrackingUtms();
    const hasNewUtms = !!(
      utmsFromRoute.utmSource
      || utmsFromRoute.utmMedium
      || utmsFromRoute.utmCampaign
      || utmsFromRoute.realtorCode
    );
    const projectChanged = params.projectSlug && store.currentProjectSlug !== params.projectSlug;
    
    if (
      store.isInitialized
      && !hasNewUtms
      && !projectChanged
      && store.hasActiveSession(SESSION_TIMEOUT_MS)
    ) {
      bindLifecycle();
      scheduleHeartbeat();
      return true;
    }

    store.loadFromStorage();

    const utms = {
      ...utmsFromRoute,
      realtorCode: params.realtorCode || utmsFromRoute.realtorCode,
      referrer: document.referrer || undefined,
      landingPage: window.location.href, // Store current page as "landing" if it's new
    };

    try {
      const response = await api.post('/tracking/session', {
        visitorId: store.visitorId,
        sessionId: store.sessionId, // Send existing session to backend if exists
        ...params,
        ...utms,
      });

      if (response) {
        if (response.visitorId) {
          store.setVisitorId(response.visitorId);
        }
        if (response.sessionId || response.id) {
          store.setSessionId(response.sessionId || response.id);
        }
        if (params.projectSlug) {
          store.setCurrentProjectSlug(params.projectSlug);
        }
        store.touchSessionActivity(response.lastSeenAt || new Date().toISOString());
        store.isInitialized = true;
        bindLifecycle();
        scheduleHeartbeat();
        return true;
      }
    } catch (error) {
      console.error('Failed to init tracking', error);
      // If initialization fails, clear the visit id and keep visitor identity for the next attempt.
      store.clearSession();
    }

    return false;
  };

  const trackEvent = async (event: {
    type: string;
    category?: string;
    action?: string;
    label?: string;
    value?: number;
    metadata?: any;
    path?: string;
  }) => {
    const sessionReady = await ensureActiveSession();
    if (!sessionReady || !store.sessionId) return;

    const payload = {
      sessionId: store.sessionId,
      ...event,
      path: event.path || route.fullPath,
    };

    try {
      await api.post('/tracking/event', payload);
      store.touchSessionActivity();
      scheduleHeartbeat();
    } catch (error: any) {
      if (
        error?.status === 400
        || error?.status === 404
        || error?.status === 409
        || error?.data?.code === 'SESSION_EXPIRED'
      ) {
        store.clearSession();

        const restored = await ensureActiveSession();
        if (!restored || !store.sessionId) return;

        try {
          await api.post('/tracking/event', {
            ...payload,
            sessionId: store.sessionId,
          });
          store.touchSessionActivity();
          scheduleHeartbeat();
        } catch {
          return;
        }
      }

      // Fail silently to not disrupt the user
      // console.error('Failed to track event', error);
    }
  };

  const trackPageView = (params?: { category?: string; label?: string; path?: string }) => {
    return trackEvent({
      type: 'PAGE_VIEW',
      ...params,
    });
  };

  const trackLotClick = (lotCode: string, mapElementId?: string, metadata?: any) => {
    return trackEvent({
      type: 'CLICK',
      category: 'LOT',
      action: 'VIEW_DETAILS',
      label: `Lote ${lotCode}`,
      metadata: { 
        lotCode, 
        lotId: mapElementId, // standardized name
        mapElementId, // for back-compat
        ...metadata 
      },
    });
  };

  const trackRealtorClick = (realtorName: string, realtorCode: string) => {
    return trackEvent({
      type: 'CLICK',
      category: 'REALTOR_LINK',
      action: 'OPEN_LINK',
      label: `${realtorName} (${realtorCode})`,
      metadata: { realtorName, realtorCode },
    });
  };

  const trackWhatsappClick = (
    params: { 
      lotCode?: string; 
      lotId?: string; // standardized
      mapElementId?: string; 
      realtorName?: string; 
      realtorCode?: string;
    }, 
    metadata?: any
  ) => {
    return trackEvent({
      type: 'CLICK',
      category: 'WHATSAPP',
      action: 'OPEN_LINK',
      label: params.lotCode ? `Lote: ${params.lotCode}` : 'Geral',
      metadata: {
        lotCode: params.lotCode,
        lotId: params.lotId || params.mapElementId,
        mapElementId: params.lotId || params.mapElementId,
        realtorName: params.realtorName,
        realtorCode: params.realtorCode,
        ...metadata,
      },
    });
  };

  const trackLeadSubmit = (type: 'FORM' | 'WHATSAPP', metadata?: any) => {
    return trackEvent({
      type: 'LEAD_SUBMIT',
      category: 'CONVERSION',
      action: type,
      metadata,
    });
  };

  const trackToolUse = (toolName: string, action: string = 'USE') => {
    return trackEvent({
      type: 'TOOL_USE',
      category: 'MAP_TOOL',
      action: action,
      label: toolName,
    });
  };

  const trackClick = (label: string, category: string = 'GENERAL_CLICK') => {
    return trackEvent({
      type: 'CLICK',
      category,
      label,
    });
  };

  return {
    initTracking,
    trackEvent,
    trackPageView,
    trackLotClick,
    trackRealtorClick,
    trackWhatsappClick,
    trackLeadSubmit,
    trackToolUse,
    trackClick,
  };
};
