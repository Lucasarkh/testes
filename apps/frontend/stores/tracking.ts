import { defineStore } from 'pinia';

export const useTrackingStore = defineStore('tracking', () => {
  const visitorId = useCookie<string | null>('tracking_visitor_id', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
  });

  const sessionId = useCookie<string | null>('tracking_visit_id', {
    maxAge: 60 * 30, // 30 minutes
    path: '/',
    sameSite: 'lax',
  });

  const currentProjectSlug = useCookie<string | null>('tracking_project_slug', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
  });

  const utmParams = ref({
    source: null as string | null,
    medium: null as string | null,
    campaign: null as string | null,
    content: null as string | null,
    term: null as string | null,
    referrer: null as string | null,
  });

  const isInitialized = ref(false);

  const setVisitorId = (id: string | null) => {
    visitorId.value = id;
  };

  const setSessionId = (id: string | null) => {
    sessionId.value = id;
  };

  const setCurrentProjectSlug = (slug: string | null) => {
    currentProjectSlug.value = slug;
  };

  const loadFromStorage = () => {
    // With useCookie, this is handled automatically on initialization
    // but we can keep it for explicit calls if needed, although it's redundant
  };

  return {
    visitorId,
    sessionId,
    currentProjectSlug,
    utmParams,
    isInitialized,
    setVisitorId,
    setSessionId,
    setCurrentProjectSlug,
    loadFromStorage,
  };
});
