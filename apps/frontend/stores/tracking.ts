import { defineStore } from 'pinia';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 30;

const clearClientCookie = (name: string) => {
  if (!import.meta.client) return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
};

const writeClientCookie = (name: string, value: string, maxAgeSeconds: number) => {
  if (!import.meta.client) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
};

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

  const lastActivityAt = useCookie<string | null>('tracking_visit_last_activity_at', {
    maxAge: 60 * 30,
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

    if (!id) {
      lastActivityAt.value = null;
      clearClientCookie('tracking_visit_id');
      clearClientCookie('tracking_visit_last_activity_at');
      return;
    }

    writeClientCookie('tracking_visit_id', id, SESSION_COOKIE_MAX_AGE_SECONDS);
  };

  const setCurrentProjectSlug = (slug: string | null) => {
    currentProjectSlug.value = slug;
  };

  const loadFromStorage = () => {
    // With useCookie, this is handled automatically on initialization
    // but we can keep it for explicit calls if needed, although it's redundant
  };

  const touchSessionActivity = (timestamp = new Date().toISOString()) => {
    if (!sessionId.value) return;

    lastActivityAt.value = timestamp;
    writeClientCookie('tracking_visit_id', sessionId.value, SESSION_COOKIE_MAX_AGE_SECONDS);
    writeClientCookie('tracking_visit_last_activity_at', timestamp, SESSION_COOKIE_MAX_AGE_SECONDS);
  };

  const getLastActivityAt = (): number => {
    if (!lastActivityAt.value) return 0;

    const parsed = new Date(lastActivityAt.value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const hasActiveSession = (timeoutMs = SESSION_TIMEOUT_MS): boolean => {
    if (!sessionId.value) return false;

    const lastActivity = getLastActivityAt();
    if (!lastActivity) return true;

    return (Date.now() - lastActivity) < timeoutMs;
  };

  const clearSession = () => {
    sessionId.value = null;
    lastActivityAt.value = null;
    isInitialized.value = false;
    clearClientCookie('tracking_visit_id');
    clearClientCookie('tracking_visit_last_activity_at');
  };

  return {
    visitorId,
    sessionId,
    lastActivityAt,
    currentProjectSlug,
    utmParams,
    isInitialized,
    setVisitorId,
    setSessionId,
    setCurrentProjectSlug,
    loadFromStorage,
    touchSessionActivity,
    getLastActivityAt,
    hasActiveSession,
    clearSession,
  };
});
