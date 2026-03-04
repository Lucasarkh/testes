import { useApi } from './useApi';

export interface ProjectBillingItem {
  projectId: string;
  projectName: string;
  projectSlug: string;
  tierNumber: number;
  basePriceCents: number;
  discountPercent: number;
  effectivePriceCents: number;
  isFree: boolean;
}

export interface PricingTableInfo {
  id: string;
  name: string;
  description?: string;
  tiers: { projectNumber: number; priceCents: number }[];
}

export interface SubscriptionStatus {
  tenantId: string;
  tenantName: string;
  billingStatus: 'OK' | 'GRACE_PERIOD' | 'INADIMPLENTE' | 'CANCELLED';
  stripeCustomerId: string | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  projects: ProjectBillingItem[];
  totalMonthlyCents: number;
  gracePeriodEnd: string | null;
  pricingTable: PricingTableInfo | null;
  volumeDiscountPercent: number;
  currentUnitPriceCents: number;
  freeProjects: number;
  activeProjectCount: number;
  maxProjects: number;
  canCreateProject: boolean;
  nextProjectPriceCents: number | null;
  trialStartedAt: string | null;
  trialEndDate: string | null;
  trialActive: boolean;
  trialExpired: boolean;
  isOnFreeTier: boolean;
  requiresSubscription: boolean;
}

export interface ProjectLimits {
  activeProjectCount: number;
  maxProjects: number;
  freeProjects: number;
  canCreateProject: boolean;
  nextProjectPriceCents: number | null;
  discountPercent: number;
  requiresSubscription: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'boleto' | 'pix';
  brand: string;
  last4: string | null;
  expMonth?: number;
  expYear?: number;
}

export interface VolumePlan {
  projectCount: number;
  unitPriceCents: number;
  totalMonthlyCents: number;
  discountPercent: number;
  isCurrent: boolean;
  isLastTier: boolean;
}

export interface AvailablePlans {
  pricingTable: { id: string; name: string; description?: string };
  basePriceCents: number;
  activeProjectCount: number;
  billingStatus: string;
  plans: VolumePlan[];
}

export const useBilling = () => {
  const { fetchApi } = useApi();

  const status = ref<SubscriptionStatus | null>(null);
  const projectLimits = ref<ProjectLimits | null>(null);
  const paymentMethods = ref<PaymentMethod[]>([]);
  const invoices = ref<any[]>([]);
  const availablePlans = ref<AvailablePlans | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchStatus = async () => {
    loading.value = true;
    error.value = null;
    try {
      status.value = await fetchApi('/billing/status');
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const fetchProjectLimits = async () => {
    try {
      projectLimits.value = await fetchApi('/billing/project-limits');
    } catch (e: any) {
      error.value = e.message;
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      paymentMethods.value = await fetchApi('/billing/payment-methods');
    } catch (e: any) {
      error.value = e.message;
    }
  };

  const fetchInvoices = async () => {
    try {
      invoices.value = await fetchApi('/billing/invoices');
    } catch (e: any) {
      error.value = e.message;
    }
  };

  const fetchPlans = async () => {
    try {
      availablePlans.value = await fetchApi('/billing/plans');
    } catch (e: any) {
      error.value = e.message;
    }
  };

  const openCheckout = async (successUrl?: string, cancelUrl?: string) => {
    try {
      const result = await fetchApi('/billing/checkout', {
        method: 'POST',
        body: { successUrl, cancelUrl },
      });
      if (result?.url) {
        window.location.href = result.url;
      }
      return result;
    } catch (e: any) {
      error.value = e.message;
      throw e;
    }
  };

  const openPortal = async () => {
    try {
      const result = await fetchApi('/billing/portal', { method: 'POST' });
      if (result?.url) {
        window.location.href = result.url;
      }
      return result;
    } catch (e: any) {
      error.value = e.message;
      throw e;
    }
  };

  // Check billing warning headers on any API response
  const billingWarning = ref<string | null>(null);

  const checkBillingHeaders = (headers: Headers) => {
    const warning = headers.get('X-Billing-Warning');
    if (warning) {
      billingWarning.value = warning;
    }
  };

  // Computed helpers
  const totalFormatted = computed(() => {
    if (!status.value) return 'R$ 0,00';
    return formatCents(status.value.totalMonthlyCents);
  });

  const nextDueDate = computed(() => {
    if (!status.value?.subscription?.currentPeriodEnd) return null;
    return new Date(status.value.subscription.currentPeriodEnd);
  });

  const nextDueDateFormatted = computed(() => {
    if (!nextDueDate.value) return '—';
    return nextDueDate.value.toLocaleDateString('pt-BR');
  });

  const isGracePeriod = computed(
    () => status.value?.billingStatus === 'GRACE_PERIOD',
  );

  const isBlocked = computed(
    () =>
      status.value?.billingStatus === 'INADIMPLENTE' ||
      status.value?.billingStatus === 'CANCELLED',
  );

  const billedProjects = computed(
    () => status.value?.projects || [],
  );

  const canCreateProject = computed(
    () => status.value?.canCreateProject ?? true,
  );

  const activeProjectCount = computed(
    () => status.value?.activeProjectCount ?? 0,
  );

  const maxProjects = computed(
    () => status.value?.maxProjects ?? 999,
  );

  const nextProjectPrice = computed(() => {
    if (status.value?.nextProjectPriceCents == null) return null;
    return formatCents(status.value.nextProjectPriceCents);
  });

  const pricingTable = computed(
    () => status.value?.pricingTable ?? null,
  );

  const volumeDiscountPercent = computed(
    () => status.value?.volumeDiscountPercent ?? 0,
  );

  const currentUnitPriceCents = computed(
    () => status.value?.currentUnitPriceCents ?? 0,
  );

  const freeProjects = computed(
    () => status.value?.freeProjects ?? 0,
  );

  const isOnFreeTier = computed(
    () => status.value?.isOnFreeTier ?? false,
  );

  const requiresSubscription = computed(
    () => status.value?.requiresSubscription ?? false,
  );

  const trialExpired = computed(
    () => status.value?.trialExpired ?? false,
  );

  const trialActive = computed(
    () => status.value?.trialActive ?? false,
  );

  const trialDaysLeft = computed(() => {
    const endDate = status.value?.trialEndDate;
    if (!endDate) return 0;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  });

  return {
    // State
    status,
    projectLimits,
    paymentMethods,
    invoices,
    availablePlans,
    loading,
    error,
    billingWarning,

    // Actions
    fetchStatus,
    fetchProjectLimits,
    fetchPaymentMethods,
    fetchInvoices,
    fetchPlans,
    openCheckout,
    openPortal,
    checkBillingHeaders,

    // Computed
    totalFormatted,
    nextDueDate,
    nextDueDateFormatted,
    isGracePeriod,
    isBlocked,
    billedProjects,
    canCreateProject,
    activeProjectCount,
    maxProjects,
    nextProjectPrice,
    pricingTable,
    volumeDiscountPercent,
    currentUnitPriceCents,
    freeProjects,
    isOnFreeTier,
    requiresSubscription,
    trialExpired,
    trialActive,
    trialDaysLeft,
  };
};

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
