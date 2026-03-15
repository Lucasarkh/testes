import { useTrackingStore } from '../stores/tracking';
import { usePublicApi } from './usePublicApi';

export const useTracking = () => {
  const store = useTrackingStore();
  const api = usePublicApi();
  const route = useRoute();

  const initTracking = async (params: { 
    tenantId?: string; 
    projectId?: string;
    tenantSlug?: string;
    projectSlug?: string;
    realtorCode?: string;
  }) => {
    const query = route.query;
    const hasNewUtms = !!(query.utm_source || query.utm_medium || query.utm_campaign || query.c);
    const projectChanged = params.projectSlug && store.currentProjectSlug !== params.projectSlug;
    
    if (store.isInitialized && !hasNewUtms && !projectChanged) return;

    store.loadFromStorage();
    
    const utms = {
      utmSource: query.utm_source as string,
      utmMedium: query.utm_medium as string,
      utmCampaign: query.utm_campaign as string,
      utmContent: query.utm_content as string,
      utmTerm: query.utm_term as string,
      realtorCode: params.realtorCode || (query.c as string),
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
        store.isInitialized = true;
      }
    } catch (error) {
      console.error('Failed to init tracking', error);
      // If initialization fails, clear the visit id and keep visitor identity for the next attempt.
      store.setSessionId(null as any);
    }
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
    if (!store.sessionId) return;

    try {
      await api.post('/tracking/event', {
        sessionId: store.sessionId,
        ...event,
        path: event.path || route.fullPath,
      });
    } catch (error: any) {
      // If we get a 400/404/500 that might indicate an invalid session (e.g. after DB reset)
      // clear the session so it can be re-created
      if (error?.response?.status === 400 || error?.response?.status === 404) {
        store.setSessionId(null as any);
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
