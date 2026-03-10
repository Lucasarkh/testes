import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/infra/db/prisma.service';
import { BillingStatus } from '@prisma/client';
import {
  UpsertPricingTableDto,
  AssignPricingTableDto,
  CreateCustomerDto,
  SavePaymentMethodDto,
  SubscriptionStatusDto,
  ProjectLimitsDto
} from './dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;
  private readonly GRACE_PERIOD_DAYS = 15;

  private activeProjectWhere(tenantId: string) {
    return {
      tenantId,
      NOT: {
        slug: {
          startsWith: 'archived-',
          mode: 'insensitive' as const
        }
      }
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — billing features will be disabled (Stripe instance not initialized)'
      );
      this.stripe = null as any;
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-01-27.acacia' as any
      });
    }
  }

  // ─── HELPER TO ENSURE STRIPE IS ACTIVE ─────────────

  private ensureStripe() {
    if (!this.stripe) {
      throw new BadRequestException(
        'Billing service is disabled. Check STRIPE_SECRET_KEY configuration.'
      );
    }
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  private getTrialState(tenant: {
    trialStartedAt: Date | null;
    trialMonths?: number | null;
    trialInterruptedAt?: Date | null;
  }) {
    const trialMonths = Math.max(1, tenant.trialMonths ?? 1);
    const trialStartedAt = tenant.trialStartedAt;
    const trialEndDate = trialStartedAt
      ? this.addMonths(new Date(trialStartedAt), trialMonths)
      : null;
    const interrupted = !!tenant.trialInterruptedAt;
    const trialActive =
      !!trialStartedAt &&
      !interrupted &&
      !!trialEndDate &&
      trialEndDate.getTime() > Date.now();
    const trialExpired = !!trialStartedAt && !trialActive;

    return {
      trialMonths,
      trialStartedAt,
      trialInterruptedAt: tenant.trialInterruptedAt ?? null,
      trialEndDate,
      trialActive,
      trialExpired
    };
  }

  private async assertBillingInteractionsAllowed(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        trialStartedAt: true,
        trialMonths: true,
        trialInterruptedAt: true
      }
    });

    const trial = this.getTrialState(tenant);
    if (trial.trialActive) {
      throw new ForbiddenException(
        'Cobrança indisponível durante o período de teste. Aguarde o término ou interrompa o teste com o SYSADMIN.'
      );
    }
  }

  // ─── CUSTOMER MANAGEMENT ────────────────────────────────

  async ensureStripeCustomer(
    tenantId: string,
    dto?: CreateCustomerDto
  ): Promise<string> {
    this.ensureStripe();
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId }
    });

    if (tenant.stripeCustomerId) {
      try {
        await this.stripe.customers.retrieve(tenant.stripeCustomerId);
        return tenant.stripeCustomerId;
      } catch {
        this.logger.warn(
          `Stripe customer ${tenant.stripeCustomerId} not found, creating new`
        );
      }
    }

    const customer = await this.stripe.customers.create({
      name: dto?.name || tenant.name,
      email: dto?.email || tenant.billingEmail || undefined,
      metadata: { tenantId: tenant.id, tenantSlug: tenant.slug }
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeCustomerId: customer.id,
        billingEmail: dto?.email || tenant.billingEmail
      }
    });

    this.logger.log(
      `Created Stripe customer ${customer.id} for tenant ${tenantId}`
    );
    return customer.id;
  }

  // ─── PAYMENT METHODS ───────────────────────────────────

  async savePaymentMethod(tenantId: string, dto: SavePaymentMethodDto) {
    await this.assertBillingInteractionsAllowed(tenantId);
    const customerId = await this.ensureStripeCustomer(tenantId);

    await this.stripe.paymentMethods.attach(dto.paymentMethodId, {
      customer: customerId
    });

    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: dto.paymentMethodId
      }
    });

    this.logger.log(
      `Saved payment method ${dto.paymentMethodId} for tenant ${tenantId}`
    );
    return { success: true, paymentMethodId: dto.paymentMethodId };
  }

  async listPaymentMethods(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId }
    });

    if (this.getTrialState(tenant).trialActive) return [];

    if (!tenant.stripeCustomerId) return [];

    const [cards, boletos] = await Promise.all([
      this.stripe.paymentMethods.list({
        customer: tenant.stripeCustomerId,
        type: 'card'
      }),
      this.stripe.paymentMethods.list({
        customer: tenant.stripeCustomerId,
        type: 'boleto'
      })
    ]);

    const result: any[] = [];
    for (const pm of cards.data) {
      result.push({
        id: pm.id,
        type: 'card',
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year
      });
    }
    for (const pm of boletos.data) {
      result.push({
        id: pm.id,
        type: 'boleto',
        brand: 'boleto',
        last4: (pm.boleto as any)?.tax_id?.slice(-4) || '****'
      });
    }

    return result;
  }

  // ─── PRICING TABLES (SYSADMIN) ─────────────────────────

  async upsertPricingTable(dto: UpsertPricingTableDto) {
    const sortedTiers = [...dto.tiers].sort(
      (a, b) => a.projectNumber - b.projectNumber
    );

    const nums = sortedTiers.map((t) => t.projectNumber);
    if (new Set(nums).size !== nums.length) {
      throw new BadRequestException('Números de projeto duplicados na tabela.');
    }

    let stripeProductId: string | undefined;
    if (dto.id) {
      const existing = await this.prisma.projectPricingTable.findUnique({
        where: { id: dto.id }
      });
      stripeProductId = existing?.stripeProductId || undefined;
    }

    if (!stripeProductId) {
      const product = await this.stripe.products.create({
        name: `Projeto Lotio — ${dto.name}`,
        metadata: { pricingTable: dto.name }
      });
      stripeProductId = product.id;
    } else {
      await this.stripe.products.update(stripeProductId, {
        name: `Projeto Lotio — ${dto.name}`
      });
    }

    if (dto.isDefault) {
      await this.prisma.projectPricingTable.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    let table: any;
    if (dto.id) {
      table = await this.prisma.projectPricingTable.update({
        where: { id: dto.id },
        data: {
          name: dto.name,
          description: dto.description,
          isDefault: dto.isDefault ?? false,
          stripeProductId
        }
      });
      await this.prisma.projectPricingTier.deleteMany({
        where: { pricingTableId: table.id }
      });
    } else {
      table = await this.prisma.projectPricingTable.create({
        data: {
          name: dto.name,
          description: dto.description,
          isDefault: dto.isDefault ?? false,
          stripeProductId
        }
      });
    }

    for (const tier of sortedTiers) {
      let stripePriceId: string | undefined;
      if (tier.priceCents > 0) {
        const price = await this.stripe.prices.create({
          product: stripeProductId,
          unit_amount: tier.priceCents,
          currency: 'brl',
          recurring: { interval: 'month' },
          metadata: {
            pricingTableId: table.id,
            projectNumber: String(tier.projectNumber)
          }
        });
        stripePriceId = price.id;
      }

      await this.prisma.projectPricingTier.create({
        data: {
          pricingTableId: table.id,
          projectNumber: tier.projectNumber,
          priceCents: tier.priceCents,
          stripePriceId
        }
      });
    }

    return this.prisma.projectPricingTable.findUniqueOrThrow({
      where: { id: table.id },
      include: { tiers: { orderBy: { projectNumber: 'asc' } } }
    });
  }

  async listPricingTables() {
    return this.prisma.projectPricingTable.findMany({
      where: { isActive: true },
      include: { tiers: { orderBy: { projectNumber: 'asc' } } },
      orderBy: { name: 'asc' }
    });
  }

  async deletePricingTable(tableId: string) {
    const tenantsUsing = await this.prisma.tenant.count({
      where: { pricingTableId: tableId }
    });
    if (tenantsUsing > 0) {
      throw new BadRequestException(
        `Não é possível excluir: ${tenantsUsing} loteadora(s) usam esta tabela.`
      );
    }

    await this.prisma.projectPricingTable.update({
      where: { id: tableId },
      data: { isActive: false }
    });
    return { message: 'Tabela de preços desativada.' };
  }

  // ─── ASSIGN PRICING TABLE TO TENANT ────────────────────

  async assignPricingTable(tenantId: string, dto: AssignPricingTableDto) {
    const table = await this.prisma.projectPricingTable.findUniqueOrThrow({
      where: { id: dto.pricingTableId },
      include: { tiers: { orderBy: { projectNumber: 'asc' } } }
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        pricingTableId: dto.pricingTableId,
        discountPercent: dto.discountPercent ?? 0,
        freeProjects: dto.freeProjects ?? 1
      }
    });

    await this.syncTenantSubscription(tenantId);

    return {
      message: `Tabela "${table.name}" atribuída com sucesso.`,
      pricingTableId: dto.pricingTableId,
      discountPercent: dto.discountPercent ?? 0,
      freeProjects: dto.freeProjects ?? 1
    };
  }

  // ─── PROJECT BILLING ───────────────────────────────────

  async onProjectCreated(tenantId: string, projectId: string) {
    // Do NOT auto-sync Stripe subscription — the subscription is managed
    // exclusively via checkout (user must pay to upgrade plan).
    this.logger.log(`Project ${projectId} created for tenant ${tenantId}`);
  }

  async onProjectDeleted(tenantId: string, projectId: string) {
    // Do NOT auto-downgrade Stripe — user keeps the plan they paid for.
    this.logger.log(`Project ${projectId} removed from tenant ${tenantId}`);
  }

  /**
   * Core sync: reconcile all active projects against the Stripe subscription.
   * VOLUME PRICING: all projects get the same per-unit price based on total count.
   * Tier N defines the per-project price when you have N projects.
   * Beyond defined tiers, the last tier's price repeats.
   */
  async syncTenantSubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        pricingTable: {
          include: { tiers: { orderBy: { projectNumber: 'asc' } } }
        },
        projects: {
          where: this.activeProjectWhere(tenantId),
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!tenant.pricingTable) {
      this.logger.debug(
        `Tenant ${tenantId} has no pricing table assigned, skipping sync`
      );
      return;
    }

    const projects = tenant.projects;
    const N = projects.length;
    const tiers = tenant.pricingTable.tiers;
    const freeProjects = tenant.freeProjects || 0;
    const additionalDiscount = tenant.discountPercent || 0;

    const trial = this.getTrialState(tenant);
    const trialActive = trial.trialActive;
    const effectiveFreeProjects = trialActive ? Math.max(freeProjects, 1) : 0;

    if (N === 0) {
      // No projects — cancel stripe sub if exists
      const localSub = await this.prisma.tenantSubscription.findUnique({
        where: { tenantId }
      });
      if (localSub?.stripeSubscriptionId) {
        try {
          await this.stripe.subscriptions.cancel(localSub.stripeSubscriptionId);
        } catch (e) {
          this.logger.warn(`Failed to cancel subscription: ${e.message}`);
        }
        await this.prisma.tenantSubscription.update({
          where: { tenantId },
          data: { status: 'canceled', stripeSubscriptionId: null }
        });
      }

      // During trial, ensure a local subscription record exists with status 'trialing'
      // so the subscription page shows correct trial state.
      if (trialActive) {
        if (!localSub) {
          await this.prisma.tenantSubscription.create({
            data: { tenantId, status: 'trialing' }
          });
        } else if (localSub.status !== 'trialing') {
          await this.prisma.tenantSubscription.update({
            where: { tenantId },
            data: { status: 'trialing' }
          });
        }
      }

      await this.syncLocalSubscriptionItems(tenantId, []);
      return;
    }

    // Volume pricing: tier matching total project count (or nearest preceding tier for gaps)
    const volumeTier = this.findVolumeTier(tiers, N);
    if (!volumeTier) {
      this.logger.warn(
        `No tiers found in pricing table for tenant ${tenantId}`
      );
      return;
    }

    let unitPriceCents = volumeTier.priceCents;
    if (additionalDiscount > 0) {
      unitPriceCents = Math.round(
        unitPriceCents * (1 - additionalDiscount / 100)
      );
    }

    const itemsToBill: {
      projectId: string;
      tierNumber: number;
      priceCents: number;
      stripePriceId?: string;
    }[] = [];

    for (let i = 0; i < N; i++) {
      const slot = i + 1;
      const isFree = slot <= effectiveFreeProjects;
      const effectivePrice = isFree ? 0 : unitPriceCents;

      itemsToBill.push({
        projectId: projects[i].id,
        tierNumber: slot,
        priceCents: effectivePrice,
        // Use the tier's Stripe Price only when no additional discount
        stripePriceId:
          !isFree && additionalDiscount === 0
            ? volumeTier.stripePriceId || undefined
            : undefined
      });
    }

    const paidItems = itemsToBill.filter((i) => i.priceCents > 0);

    if (paidItems.length === 0) {
      const localSub = await this.prisma.tenantSubscription.findUnique({
        where: { tenantId }
      });
      if (localSub?.stripeSubscriptionId) {
        try {
          await this.stripe.subscriptions.cancel(localSub.stripeSubscriptionId);
        } catch (e) {
          this.logger.warn(`Failed to cancel subscription: ${e.message}`);
        }
        await this.prisma.tenantSubscription.update({
          where: { tenantId },
          data: { status: 'canceled', stripeSubscriptionId: null }
        });
      }
      await this.syncLocalSubscriptionItems(
        tenantId,
        itemsToBill,
        trialActive ? 'trialing' : 'active'
      );
      return;
    }

    const customerId = await this.ensureStripeCustomer(tenantId);

    // All paid items share the same unit price — find or create a single Stripe Price
    let commonStripePriceId = paidItems[0].stripePriceId;
    if (!commonStripePriceId) {
      const price = await this.stripe.prices.create({
        product: tenant.pricingTable.stripeProductId!,
        unit_amount: unitPriceCents,
        currency: 'brl',
        recurring: { interval: 'month' },
        metadata: {
          tenantId,
          volumeLevel: String(N),
          pricingTableId: tenant.pricingTable.id
        }
      });
      commonStripePriceId = price.id;
    }

    const stripeItems: Stripe.SubscriptionCreateParams.Item[] = paidItems.map(
      () => ({
        price: commonStripePriceId,
        quantity: 1
      })
    );

    // Update stripe price id on all paid items
    for (const item of paidItems) {
      item.stripePriceId = commonStripePriceId;
    }

    let localSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { items: true }
    });

    let stripeSub: Stripe.Subscription;

    if (localSub?.stripeSubscriptionId) {
      const existingSub = await this.stripe.subscriptions.retrieve(
        localSub.stripeSubscriptionId,
        { expand: ['items'] }
      );

      const updateItems: Stripe.SubscriptionUpdateParams.Item[] = [];
      for (const item of existingSub.items.data) {
        updateItems.push({ id: item.id, deleted: true });
      }
      for (const newItem of stripeItems) {
        updateItems.push(newItem);
      }

      stripeSub = await this.stripe.subscriptions.update(
        localSub.stripeSubscriptionId,
        {
          items: updateItems,
          proration_behavior: 'create_prorations',
          payment_settings: {
            payment_method_types: ['card', 'boleto']
          }
        }
      );
    } else {
      const createParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: stripeItems,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card', 'boleto']
        },
        expand: ['latest_invoice.payment_intent']
      };

      if (localSub?.billingDay) {
        const anchorDate = this.computeNextBillingDate(localSub.billingDay);
        createParams.billing_cycle_anchor = Math.floor(
          anchorDate.getTime() / 1000
        );
      }

      stripeSub = await this.stripe.subscriptions.create(createParams);
    }

    const subData: any = {
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status,
      currentPeriodStart: new Date(
        (stripeSub as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000)
    };

    if (localSub) {
      await this.prisma.tenantSubscription.update({
        where: { tenantId },
        data: subData
      });
    } else {
      localSub = await this.prisma.tenantSubscription.create({
        data: { tenantId, ...subData },
        include: { items: true }
      });
    }

    const stripeSubItems = stripeSub.items.data;

    await this.prisma.tenantSubscriptionItem.deleteMany({
      where: { subscriptionId: localSub.id }
    });

    let stripeIdx = 0;
    for (const item of itemsToBill) {
      const stripeItem =
        item.priceCents > 0 && stripeIdx < stripeSubItems.length
          ? stripeSubItems[stripeIdx++]
          : null;

      await this.prisma.tenantSubscriptionItem.create({
        data: {
          subscriptionId: localSub.id,
          projectId: item.projectId,
          tierNumber: item.tierNumber,
          stripeSubscriptionItemId: stripeItem?.id,
          stripePriceId: stripeItem?.price.id || item.stripePriceId,
          priceCents: item.priceCents,
          isActive: true
        }
      });
    }

    this.logger.log(
      `Synced subscription for tenant ${tenantId}: ${paidItems.length} paid projects, ${stripeSub.id}`
    );
  }

  private async syncLocalSubscriptionItems(
    tenantId: string,
    items: { projectId: string; tierNumber: number; priceCents: number }[],
    defaultStatus: string = 'active'
  ) {
    let localSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });

    if (!localSub) {
      localSub = await this.prisma.tenantSubscription.create({
        data: { tenantId, status: defaultStatus }
      });
    }

    await this.prisma.tenantSubscriptionItem.deleteMany({
      where: { subscriptionId: localSub.id }
    });

    for (const item of items) {
      await this.prisma.tenantSubscriptionItem.create({
        data: {
          subscriptionId: localSub.id,
          projectId: item.projectId,
          tierNumber: item.tierNumber,
          priceCents: item.priceCents,
          isActive: true
        }
      });
    }
  }

  // ─── PROJECT LIMITS ────────────────────────────────────

  async getProjectLimits(tenantId: string): Promise<ProjectLimitsDto> {
    const [tenant, activeProjectCount] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        pricingTable: {
          include: { tiers: { orderBy: { projectNumber: 'asc' } } }
        },
        subscription: true
      }
      }),
      this.prisma.project.count({
        where: this.activeProjectWhere(tenantId)
      })
    ]);

    const N = activeProjectCount;
    const tiers = tenant.pricingTable?.tiers || [];
    const freeProjects = tenant.freeProjects || 0;
    const additionalDiscount = tenant.discountPercent || 0;

    const trial = this.getTrialState(tenant);
    const trialActive = trial.trialActive;
    const effectiveFreeProjects = trialActive ? Math.max(freeProjects, 1) : 0;

    // maxProjects = max(effectiveFreeProjects, subscription.maxProjects)
    // This is the hard cap the user paid for.
    const subMaxProjects = tenant.subscription?.maxProjects || 0;
    const maxProjects = Math.max(effectiveFreeProjects, subMaxProjects);

    // User can create if: not blocked AND under the paid limit
    const canCreateProject =
      tenant.billingStatus !== BillingStatus.INADIMPLENTE &&
      tenant.billingStatus !== BillingStatus.CANCELLED &&
      N < maxProjects;

    // requiresSubscription = they're at the free limit and don't have a paid plan covering more
    const requiresSubscription = N >= maxProjects;

    let nextProjectPriceCents: number | null = null;
    if (tiers.length > 0) {
      const nextN = N + 1;
      const nextTier = this.findVolumeTier(tiers, nextN);
      let unitPrice = nextTier.priceCents;
      if (additionalDiscount > 0) {
        unitPrice = Math.round(unitPrice * (1 - additionalDiscount / 100));
      }
      const currentTier = N > 0 ? this.findVolumeTier(tiers, N) : null;
      let currentUnitPrice = currentTier?.priceCents || 0;
      if (additionalDiscount > 0) {
        currentUnitPrice = Math.round(
          currentUnitPrice * (1 - additionalDiscount / 100)
        );
      }
      const currentTotal = N * currentUnitPrice;
      const newTotal = nextN * unitPrice;
      nextProjectPriceCents = Math.max(0, newTotal - currentTotal);
    }

    return {
      activeProjectCount: N,
      maxProjects,
      freeProjects: effectiveFreeProjects,
      canCreateProject,
      nextProjectPriceCents,
      discountPercent: additionalDiscount,
      requiresSubscription
    };
  }

  async validateProjectCreation(tenantId: string): Promise<void> {
    const [tenant, activeProjects] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        subscription: true
      }
      }),
      this.prisma.project.count({
        where: this.activeProjectWhere(tenantId)
      })
    ]);

    if (tenant.billingStatus === BillingStatus.INADIMPLENTE) {
      throw new ForbiddenException(
        'Não é possível criar projetos com pagamento inadimplente. Regularize sua assinatura.'
      );
    }

    if (tenant.billingStatus === BillingStatus.CANCELLED) {
      throw new ForbiddenException(
        'Assinatura cancelada. Reative sua assinatura para criar projetos.'
      );
    }

    // Ensure pricing table is assigned
    if (!tenant.pricingTableId) {
      await this.autoAssignDefaultPricingTable(tenantId);
    }

    const freeProjects = tenant.freeProjects || 0;
    const trial = this.getTrialState(tenant);
    const trialActive = trial.trialActive;
    const effectiveFreeProjects = trialActive ? Math.max(freeProjects, 1) : 0;

    // Hard limit: max(effectiveFreeProjects, subscription.maxProjects)
    // User can only create projects up to the plan they PAID for.
    const subMaxProjects = tenant.subscription?.maxProjects || 0;
    const maxAllowed = Math.max(effectiveFreeProjects, subMaxProjects);

    if (activeProjects >= maxAllowed) {
      throw new ForbiddenException(
        JSON.stringify({
          code: 'SUBSCRIPTION_REQUIRED',
          message:
            maxAllowed === 0
              ? trialActive
                ? 'Para criar mais projetos, é necessário assinar um plano.'
                : 'Seu período de teste expirou. Assine um plano para continuar.'
              : `Seu plano atual permite até ${maxAllowed} projeto(s). Faça upgrade para criar mais.`,
          redirectTo: '/painel/assinatura'
        })
      );
    }
  }

  // ─── BILLING CYCLE ANCHOR ──────────────────────────────

  /**
   * Auto-assign the default pricing table to a tenant (if one exists).
   * Used on tenant registration and when creating projects without a table.
   */
  async autoAssignDefaultPricingTable(tenantId: string): Promise<void> {
    const defaultTable = await this.prisma.projectPricingTable.findFirst({
      where: { isDefault: true, isActive: true }
    });
    if (!defaultTable) {
      this.logger.debug(
        `No default pricing table found, skipping auto-assign for tenant ${tenantId}`
      );
      return;
    }
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        pricingTableId: defaultTable.id,
        discountPercent: 0
      }
    });
    this.logger.log(
      `Auto-assigned default pricing table "${defaultTable.name}" to tenant ${tenantId}`
    );

    // Sync subscription so local items and Stripe are consistent
    await this.syncTenantSubscription(tenantId);
  }

  /**
   * Returns available plan levels for the tenant's pricing table.
   * VOLUME PRICING: each level N means all N projects share the tier-N unit price.
   * discountPercent is derived from (basePriceCents - tierN.priceCents) / basePriceCents.
   */
  async getAvailablePlans(tenantId: string, _attempt = 0) {
    const [tenant, realProjectCount] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        pricingTable: {
          include: { tiers: { orderBy: { projectNumber: 'asc' } } }
        }
      }
      }),
      this.prisma.project.count({
        where: this.activeProjectWhere(tenantId)
      })
    ]);

    if (!tenant.pricingTable) {
      if (_attempt > 0) {
        // No default pricing table configured — return an empty plan list
        return {
          pricingTable: null,
          basePriceCents: 0,
          activeProjectCount: realProjectCount,
          paidPlanLevel: 0,
          billingStatus: tenant.billingStatus,
          plans: []
        };
      }
      await this.autoAssignDefaultPricingTable(tenantId);
      return this.getAvailablePlans(tenantId, _attempt + 1);
    }

    const tiers = tenant.pricingTable.tiers;
    const freeProjects = tenant.freeProjects || 0;
    const baseTier = tiers[0]; // tier 1 = base price, 0% discount
    const basePriceCents = baseTier?.priceCents || 0;

    const trial = this.getTrialState(tenant);
    const trialActive = trial.trialActive;
    const effectiveFreeProjects = trialActive ? Math.max(freeProjects, 1) : 0;

    // Use the subscription's maxProjects (what the user PAID for) to determine the current plan.
    // During trial with no subscription, use the effective free tier.
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });
    const subMaxProjects = sub?.maxProjects || 0;
    const paidPlanLevel = Math.max(effectiveFreeProjects, subMaxProjects);

    const plans = tiers.map((tier) => {
      const unitPriceCents = tier.priceCents;
      const totalMonthlyCents = tier.projectNumber * unitPriceCents;
      const discountPercent =
        basePriceCents > 0
          ? Math.round(
              ((basePriceCents - unitPriceCents) / basePriceCents) * 100
            )
          : 0;
      const isLastTier =
        tier.projectNumber === tiers[tiers.length - 1].projectNumber;

      // Current plan: based on what the user PAID for, not how many projects they actually have.
      const isCurrent = isLastTier
        ? paidPlanLevel >= tier.projectNumber
        : paidPlanLevel === tier.projectNumber;

      return {
        projectCount: tier.projectNumber,
        unitPriceCents,
        totalMonthlyCents,
        discountPercent,
        isCurrent,
        isLastTier
      };
    });

    return {
      pricingTable: {
        id: tenant.pricingTable.id,
        name: tenant.pricingTable.name,
        description: tenant.pricingTable.description
      },
      basePriceCents,
      activeProjectCount: realProjectCount,
      paidPlanLevel,
      billingStatus: tenant.billingStatus,
      plans
    };
  }

  async setTenantTrialPeriod(tenantId: string, trialMonths: number) {
    if (!Number.isInteger(trialMonths) || trialMonths < 1 || trialMonths > 24) {
      throw new BadRequestException(
        'trialMonths deve ser um inteiro entre 1 e 24.'
      );
    }

    const existingSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });
    if (existingSub?.stripeSubscriptionId && this.stripe) {
      try {
        await this.stripe.subscriptions.cancel(
          existingSub.stripeSubscriptionId
        );
      } catch (err) {
        this.logger.warn(
          `Failed to cancel Stripe subscription for tenant ${tenantId}: ${err.message}`
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          trialStartedAt: new Date(),
          trialMonths,
          trialInterruptedAt: null,
          billingStatus: BillingStatus.OK,
          gracePeriodEnd: null
        }
      });

      await tx.tenantSubscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          status: 'trialing',
          stripeSubscriptionId: null,
          maxProjects: 0,
          currentPeriodStart: null,
          currentPeriodEnd: null
        },
        update: {
          status: 'trialing',
          stripeSubscriptionId: null,
          maxProjects: 0,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        }
      });
    });

    await this.syncTenantSubscription(tenantId);
    const status = await this.getSubscriptionStatus(tenantId);

    return {
      message: `Período de teste configurado para ${trialMonths} mes(es). Cobrança desativada durante o teste.`,
      trialMonths,
      trialStartedAt: status.trialStartedAt,
      trialEndDate: status.trialEndDate,
      trialActive: status.trialActive
    };
  }

  async interruptTenantTrial(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        trialStartedAt: true,
        trialMonths: true,
        trialInterruptedAt: true
      }
    });

    const trial = this.getTrialState(tenant);
    if (!trial.trialActive) {
      throw new BadRequestException(
        'A tenant não está em período de teste ativo.'
      );
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        trialInterruptedAt: new Date()
      }
    });

    await this.syncTenantSubscription(tenantId);
    const status = await this.getSubscriptionStatus(tenantId);

    return {
      message:
        'Período de teste interrompido. Fluxos de cobrança podem ser habilitados imediatamente.',
      trialActive: status.trialActive,
      trialEndDate: status.trialEndDate
    };
  }

  async setBillingAnchor(tenantId: string, billingDay: number) {
    if (billingDay < 1 || billingDay > 28) {
      throw new BadRequestException(
        'O dia de vencimento deve estar entre 1 e 28.'
      );
    }

    await this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      create: { tenantId, billingDay },
      update: { billingDay }
    });

    const localSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });

    if (localSub?.stripeSubscriptionId) {
      // Only shift the Stripe billing anchor for healthy tenants.
      // Applying trial_end on a past_due/canceled subscription triggers a 'trialing'
      // status update via webhook which inadvertently clears GRACE_PERIOD/INADIMPLENTE.
      const tenantForAnchor = await this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId }
      });
      const isHealthy =
        tenantForAnchor.billingStatus === BillingStatus.OK ||
        tenantForAnchor.billingStatus === BillingStatus.GRACE_PERIOD;

      if (isHealthy) {
        try {
          const nextBillingDate = this.computeNextBillingDate(billingDay);
          const nextBillingTimestamp = Math.floor(
            nextBillingDate.getTime() / 1000
          );

          await this.stripe.subscriptions.update(
            localSub.stripeSubscriptionId,
            {
              trial_end: nextBillingTimestamp,
              proration_behavior: 'none'
            }
          );

          this.logger.log(
            `Updated billing anchor for tenant ${tenantId}: day ${billingDay}, next billing ${nextBillingDate.toISOString()}`
          );
        } catch (err) {
          this.logger.warn(
            `Could not reschedule Stripe subscription for tenant ${tenantId}: ${err.message}`
          );
        }
      } else {
        this.logger.debug(
          `Skipped Stripe billing anchor update for tenant ${tenantId} due to billing status: ${tenantForAnchor.billingStatus}`
        );
      }
    }

    return {
      message: 'Dia de vencimento atualizado',
      billingDay,
      nextBillingDate: this.computeNextBillingDate(billingDay).toISOString()
    };
  }

  private computeNextBillingDate(billingDay: number): Date {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Try the target day in the current month first
    const daysInCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();
    const safeDayCurrentMonth = Math.min(billingDay, daysInCurrentMonth);
    const thisMonthDate = new Date(
      currentYear,
      currentMonth,
      safeDayCurrentMonth,
      12,
      0,
      0
    );

    // If the billing day hasn't passed yet this month, use it
    if (thisMonthDate > now) {
      return thisMonthDate;
    }

    // Otherwise advance to next month
    let targetMonth = currentMonth + 1;
    let targetYear = currentYear;

    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }

    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const safeDay = Math.min(billingDay, daysInMonth);

    return new Date(targetYear, targetMonth, safeDay, 12, 0, 0);
  }

  /**
   * Find the applicable volume pricing tier for N projects.
   * If no exact match exists (non-contiguous tier table), uses the nearest
   * preceding tier — not the last/cheapest tier — to avoid unintended discounts.
   */
  private findVolumeTier<T extends { projectNumber: number }>(
    tiers: T[],
    n: number
  ): T {
    const exact = tiers.find((t) => t.projectNumber === n);
    if (exact) return exact;
    // Non-contiguous tables: use the nearest preceding tier
    const preceding = [...tiers].reverse().find((t) => t.projectNumber < n);
    if (preceding) return preceding;
    // n < first tier or empty list: return last as safest fallback
    return tiers[tiers.length - 1];
  }

  // ─── CHECKOUT SESSION ──────────────────────────────────

  async createCheckoutSession(
    tenantId: string,
    successUrl?: string,
    cancelUrl?: string
  ) {
    await this.assertBillingInteractionsAllowed(tenantId);
    const customerId = await this.ensureStripeCustomer(tenantId);
    const baseDomain =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url:
        successUrl || `${baseDomain}/painel/assinatura?status=success`,
      cancel_url: cancelUrl || `${baseDomain}/painel/assinatura?status=cancel`,
      metadata: { tenantId }
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Create a Stripe Checkout Session in 'subscription' mode.
   * This actually charges the user and creates the Stripe subscription.
   * `projectCount` = the number of projects the user wants (tier level).
   */
  async createSubscriptionCheckout(
    tenantId: string,
    projectCount: number,
    successUrl?: string,
    cancelUrl?: string,
    _attempt = 0
  ) {
    await this.assertBillingInteractionsAllowed(tenantId);

    if (!projectCount || projectCount < 1 || !Number.isInteger(projectCount)) {
      throw new BadRequestException(
        'projectCount deve ser um número inteiro positivo.'
      );
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        pricingTable: {
          include: { tiers: { orderBy: { projectNumber: 'asc' } } }
        },
        _count: { select: { projects: true } }
      }
    });

    if (!tenant.pricingTable) {
      if (_attempt > 0) {
        throw new BadRequestException(
          'Nenhuma tabela de preços configurada. Entre em contato com o suporte.'
        );
      }
      await this.autoAssignDefaultPricingTable(tenantId);
      return this.createSubscriptionCheckout(
        tenantId,
        projectCount,
        successUrl,
        cancelUrl,
        _attempt + 1
      );
    }

    const tiers = tenant.pricingTable.tiers;
    if (tiers.length === 0) {
      throw new BadRequestException('Nenhuma faixa de preço configurada.');
    }

    // Find the tier for the requested project count (or nearest preceding tier for gaps)
    const tier = this.findVolumeTier(tiers, projectCount);
    const additionalDiscount = tenant.discountPercent || 0;
    let unitPriceCents = tier.priceCents;
    if (additionalDiscount > 0) {
      unitPriceCents = Math.round(
        unitPriceCents * (1 - additionalDiscount / 100)
      );
    }

    // Charge the FULL plan amount (projectCount × unitPrice).
    // Subscribing replaces the trial — user pays the total shown on the plan card.
    const paidCount = projectCount;

    const customerId = await this.ensureStripeCustomer(tenantId);
    const baseDomain =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    // Find or create a Stripe Price for this unit amount
    let stripePriceId = tier.stripePriceId;
    if (!stripePriceId || additionalDiscount > 0) {
      const price = await this.stripe.prices.create({
        product: tenant.pricingTable.stripeProductId!,
        unit_amount: unitPriceCents,
        currency: 'brl',
        recurring: { interval: 'month' },
        metadata: {
          tenantId,
          volumeLevel: String(projectCount),
          pricingTableId: tenant.pricingTable.id
        }
      });
      stripePriceId = price.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card', 'boleto'],
      line_items: [
        {
          price: stripePriceId,
          quantity: paidCount
        }
      ],
      success_url:
        successUrl || `${baseDomain}/painel/assinatura?status=subscribed`,
      cancel_url: cancelUrl || `${baseDomain}/painel/assinatura?status=cancel`,
      metadata: { tenantId, projectCount: String(projectCount) },
      subscription_data: {
        metadata: { tenantId, projectCount: String(projectCount) }
      }
    });

    return { sessionId: session.id, url: session.url };
  }

  async createPortalSession(tenantId: string) {
    await this.assertBillingInteractionsAllowed(tenantId);

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId }
    });

    // Auto-create Stripe customer if not yet configured
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      customerId = await this.ensureStripeCustomer(tenantId);
    }

    const portalConfig = await this.getOrCreatePortalConfiguration();

    const baseDomain =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseDomain}/painel/assinatura`,
      configuration: portalConfig
    });

    return { url: session.url };
  }

  private portalConfigId: string | null = null;
  private async getOrCreatePortalConfiguration(): Promise<string> {
    if (this.portalConfigId) return this.portalConfigId;

    try {
      const configs = await this.stripe.billingPortal.configurations.list({
        limit: 1
      });
      if (configs.data.length > 0) {
        this.portalConfigId = configs.data[0].id;
        await this.stripe.billingPortal.configurations.update(
          this.portalConfigId,
          {
            features: {
              payment_method_update: { enabled: true },
              invoice_history: { enabled: true }
            },
            business_profile: {
              headline: 'Gerencie sua assinatura Lotio'
            }
          }
        );
        return this.portalConfigId;
      }

      const config = await this.stripe.billingPortal.configurations.create({
        features: {
          payment_method_update: { enabled: true },
          invoice_history: { enabled: true }
        },
        business_profile: {
          headline: 'Gerencie sua assinatura Lotio'
        }
      });
      this.portalConfigId = config.id;
      return this.portalConfigId;
    } catch (err) {
      this.logger.warn(`Failed to create portal config: ${err.message}`);
      return undefined as any;
    }
  }

  // ─── WEBHOOK HANDLING ──────────────────────────────────

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret!
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      default:
        this.logger.debug(`Unhandled webhook event: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Handle checkout.session.completed — link the new Stripe subscription to our local records.
   * Only grant access (billingStatus=OK) when payment was actually collected.
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) {
      this.logger.warn(
        'checkout.session.completed missing tenantId in metadata'
      );
      return;
    }

    // Only process subscription-mode sessions
    if (session.mode !== 'subscription' || !session.subscription) return;

    const stripeSubId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as any)?.id;

    if (!stripeSubId) return;

    const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubId);

    // Extract maxProjects from subscription metadata (set during createSubscriptionCheckout)
    const maxProjects = parseInt(stripeSub.metadata?.projectCount || '0', 10);

    // Cancel the previous subscription if the tenant is upgrading (new sub !== old sub)
    const existingLocalSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });
    if (
      existingLocalSub?.stripeSubscriptionId &&
      existingLocalSub.stripeSubscriptionId !== stripeSubId
    ) {
      try {
        await this.stripe.subscriptions.cancel(
          existingLocalSub.stripeSubscriptionId
        );
        this.logger.log(
          `Cancelled old subscription ${existingLocalSub.stripeSubscriptionId} for tenant ${tenantId} (replaced by ${stripeSubId})`
        );
      } catch (e) {
        this.logger.warn(
          `Could not cancel old subscription ${existingLocalSub.stripeSubscriptionId}: ${e.message}`
        );
      }
    }

    const subData = {
      stripeSubscriptionId: stripeSubId,
      status: stripeSub.status,
      maxProjects,
      currentPeriodStart: new Date(
        (stripeSub as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000)
    };

    await this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      create: { tenantId, ...subData },
      update: subData
    });

    // Only set billingStatus to OK if the payment was actually collected.
    // session.payment_status = 'paid' means Stripe collected the money.
    // subscription.status = 'active' means the subscription is fully operational.
    // 'incomplete' means payment still pending (3D Secure, boleto, etc.)
    if (
      session.payment_status === 'paid' &&
      (stripeSub.status === 'active' || stripeSub.status === 'trialing')
    ) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { billingStatus: BillingStatus.OK, gracePeriodEnd: null }
      });
      this.logger.log(
        `Checkout completed & paid for tenant ${tenantId}, subscription ${stripeSubId} active`
      );
    } else {
      this.logger.warn(
        `Checkout completed for tenant ${tenantId} but payment_status=${session.payment_status}, ` +
          `subscription.status=${stripeSub.status}. Awaiting payment confirmation via invoice.paid webhook.`
      );
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription
      ? typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : (invoice as any).subscription?.id
      : null;

    if (!subscriptionId) return;

    const localSub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId }
    });
    if (!localSub) return;

    await this.prisma.tenant.update({
      where: { id: localSub.tenantId },
      data: {
        billingStatus: BillingStatus.OK,
        gracePeriodEnd: null
      }
    });

    await this.prisma.billingInvoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        tenantId: localSub.tenantId,
        stripeInvoiceId: invoice.id,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        invoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        periodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
        paidAt: new Date(),
        attemptCount: invoice.attempt_count || 0
      },
      update: {
        amountPaid: invoice.amount_paid,
        status: 'paid',
        paidAt: new Date(),
        attemptCount: invoice.attempt_count || 0
      }
    });

    this.logger.log(
      `Invoice ${invoice.id} paid for tenant ${localSub.tenantId}`
    );
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription
      ? typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : (invoice as any).subscription?.id
      : null;

    if (!subscriptionId) return;

    const localSub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId }
    });
    if (!localSub) return;

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: localSub.tenantId }
    });

    const now = new Date();

    if (tenant.billingStatus === BillingStatus.OK) {
      const graceEnd = new Date(now);
      graceEnd.setDate(graceEnd.getDate() + this.GRACE_PERIOD_DAYS);

      await this.prisma.tenant.update({
        where: { id: localSub.tenantId },
        data: {
          billingStatus: BillingStatus.GRACE_PERIOD,
          gracePeriodEnd: graceEnd
        }
      });

      this.logger.warn(
        `Payment failed for tenant ${localSub.tenantId}. Grace period until ${graceEnd.toISOString()}`
      );
    } else if (
      tenant.billingStatus === BillingStatus.GRACE_PERIOD &&
      tenant.gracePeriodEnd &&
      now > tenant.gracePeriodEnd
    ) {
      await this.prisma.tenant.update({
        where: { id: localSub.tenantId },
        data: { billingStatus: BillingStatus.INADIMPLENTE }
      });

      this.logger.error(`Tenant ${localSub.tenantId} marked as INADIMPLENTE`);
    }

    await this.prisma.billingInvoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        tenantId: localSub.tenantId,
        stripeInvoiceId: invoice.id,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid || 0,
        currency: invoice.currency,
        status: 'open',
        invoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        periodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
        attemptCount: invoice.attempt_count || 0,
        lastAttemptAt: now
      },
      update: {
        status: 'open',
        attemptCount: invoice.attempt_count || 0,
        lastAttemptAt: now
      }
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const localSub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    });
    if (!localSub) return;

    // Update maxProjects from subscription metadata or item quantity
    const metaProjectCount = parseInt(
      subscription.metadata?.projectCount || '0',
      10
    );
    const itemQuantity =
      subscription.items?.data?.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      ) || 0;
    const newMaxProjects = metaProjectCount || itemQuantity;

    await this.prisma.tenantSubscription.update({
      where: { id: localSub.id },
      data: {
        status: subscription.status,
        maxProjects: newMaxProjects > 0 ? newMaxProjects : undefined,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });

    // Sync tenant billingStatus based on the real subscription state
    if (
      subscription.status === 'active' ||
      subscription.status === 'trialing'
    ) {
      await this.prisma.tenant.update({
        where: { id: localSub.tenantId },
        data: { billingStatus: BillingStatus.OK, gracePeriodEnd: null }
      });
      this.logger.log(
        `Subscription ${subscription.id} is ${subscription.status} → tenant ${localSub.tenantId} billingStatus=OK`
      );
    } else if (subscription.status === 'past_due') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: localSub.tenantId }
      });
      if (tenant && tenant.billingStatus === BillingStatus.OK) {
        const graceEnd = new Date();
        graceEnd.setDate(graceEnd.getDate() + this.GRACE_PERIOD_DAYS);
        await this.prisma.tenant.update({
          where: { id: localSub.tenantId },
          data: {
            billingStatus: BillingStatus.GRACE_PERIOD,
            gracePeriodEnd: graceEnd
          }
        });
        this.logger.warn(
          `Subscription ${subscription.id} past_due → tenant ${localSub.tenantId} GRACE_PERIOD until ${graceEnd.toISOString()}`
        );
      }
    } else if (
      subscription.status === 'incomplete_expired' ||
      subscription.status === 'canceled' ||
      subscription.status === 'unpaid'
    ) {
      await this.prisma.tenant.update({
        where: { id: localSub.tenantId },
        data: { billingStatus: BillingStatus.INADIMPLENTE }
      });
      this.logger.error(
        `Subscription ${subscription.id} ${subscription.status} → tenant ${localSub.tenantId} INADIMPLENTE`
      );
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const localSub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    });
    if (!localSub) return;

    await this.prisma.tenantSubscription.update({
      where: { id: localSub.id },
      data: { status: 'canceled' }
    });

    // Mark tenant as CANCELLED so project creation is blocked
    await this.prisma.tenant.update({
      where: { id: localSub.tenantId },
      data: { billingStatus: BillingStatus.CANCELLED }
    });

    this.logger.warn(
      `Subscription ${subscription.id} deleted → tenant ${localSub.tenantId} CANCELLED`
    );
  }

  // ─── GRACE PERIOD CRON ─────────────────────────────────

  async checkGracePeriods() {
    const now = new Date();

    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        billingStatus: BillingStatus.GRACE_PERIOD,
        gracePeriodEnd: { lt: now }
      }
    });

    for (const tenant of expiredTenants) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { billingStatus: BillingStatus.INADIMPLENTE }
      });
      this.logger.error(
        `Tenant ${tenant.id} (${tenant.name}) grace period expired → INADIMPLENTE`
      );
    }

    if (expiredTenants.length > 0) {
      this.logger.warn(
        `Marked ${expiredTenants.length} tenant(s) as INADIMPLENTE`
      );
    }
  }

  // ─── SUBSCRIPTION STATUS ───────────────────────────────

  async getSubscriptionStatus(
    tenantId: string
  ): Promise<SubscriptionStatusDto> {
    const [tenant, activeProjectCount] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        subscription: { include: { items: { include: { project: true } } } },
        pricingTable: {
          include: { tiers: { orderBy: { projectNumber: 'asc' } } }
        }
      }
      }),
      this.prisma.project.count({
        where: this.activeProjectWhere(tenantId)
      })
    ]);

    const tiers = tenant.pricingTable?.tiers || [];
    const additionalDiscount = tenant.discountPercent || 0;
    const freeProjects = tenant.freeProjects || 0;
    // Trial detection (computed early so it's available for project-level isFree)
    const hasActivePaidSub =
      !!tenant.subscription?.stripeSubscriptionId &&
      tenant.subscription.status !== 'canceled' &&
      tenant.subscription.status !== 'incomplete_expired';
    const trial = this.getTrialState(tenant);
    const trialActive = trial.trialActive;
    const trialEndDate = trial.trialEndDate;
    const effectiveFreeProjects = trialActive ? Math.max(freeProjects, 1) : 0;
    const isOnFreeTier =
      trialActive &&
      activeProjectCount <= effectiveFreeProjects &&
      !hasActivePaidSub;
    const trialExpired = trial.trialExpired;
    const requiresSubscription =
      activeProjectCount >= effectiveFreeProjects && !hasActivePaidSub;
    const billingInteractionAllowed = !trialActive;

    // Volume pricing: find the tier for current project count
    const basePriceCents = tiers[0]?.priceCents || 0;
    const volumeTier =
      activeProjectCount > 0
        ? this.findVolumeTier(tiers, activeProjectCount)
        : tiers[0];
    let currentUnitPrice = volumeTier?.priceCents || 0;
    if (additionalDiscount > 0) {
      currentUnitPrice = Math.round(
        currentUnitPrice * (1 - additionalDiscount / 100)
      );
    }

    const volumeDiscountPercent =
      basePriceCents > 0
        ? Math.round(
            ((basePriceCents - (volumeTier?.priceCents || 0)) /
              basePriceCents) *
              100
          )
        : 0;

    const projects = (tenant.subscription?.items || []).map((item) => {
      const tierNumber = item.tierNumber || 0;
      const isFree = tierNumber <= effectiveFreeProjects;
      const effectivePriceCents = item.priceCents || 0;

      return {
        projectId: item.projectId || '',
        projectName: (item.project as any)?.name || 'Projeto removido',
        projectSlug: (item.project as any)?.slug || '',
        tierNumber,
        basePriceCents: currentUnitPrice,
        discountPercent: volumeDiscountPercent,
        effectivePriceCents,
        isFree
      };
    });

    const totalMonthlyCents = projects.reduce(
      (sum, p) => sum + p.effectivePriceCents,
      0
    );

    const subMaxProjects = tenant.subscription?.maxProjects || 0;
    const maxAllowed = Math.max(effectiveFreeProjects, subMaxProjects);

    const canCreateProject =
      tenant.billingStatus !== BillingStatus.INADIMPLENTE &&
      tenant.billingStatus !== BillingStatus.CANCELLED &&
      activeProjectCount < maxAllowed;

    let nextProjectPriceCents: number | null = null;
    if (tiers.length > 0) {
      const nextN = activeProjectCount + 1;
      const nextTier = this.findVolumeTier(tiers, nextN);
      let nextUnit = nextTier?.priceCents || 0;
      if (additionalDiscount > 0) {
        nextUnit = Math.round(nextUnit * (1 - additionalDiscount / 100));
      }
      // Incremental cost of adding one more project (volume repricing)
      nextProjectPriceCents = Math.max(
        0,
        nextN * nextUnit - activeProjectCount * currentUnitPrice
      );
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      billingStatus: tenant.billingStatus,
      stripeCustomerId: tenant.stripeCustomerId,
      subscription: tenant.subscription
        ? {
            id: tenant.subscription.id,
            status: tenant.subscription.status,
            currentPeriodStart: tenant.subscription.currentPeriodStart,
            currentPeriodEnd: tenant.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: tenant.subscription.cancelAtPeriodEnd
          }
        : null,
      projects,
      totalMonthlyCents,
      gracePeriodEnd: tenant.gracePeriodEnd,
      pricingTable: tenant.pricingTable
        ? {
            id: tenant.pricingTable.id,
            name: tenant.pricingTable.name,
            description: tenant.pricingTable.description ?? undefined,
            tiers: tiers.map((t) => ({
              projectNumber: t.projectNumber,
              priceCents: t.priceCents
            }))
          }
        : null,
      volumeDiscountPercent,
      currentUnitPriceCents: currentUnitPrice,
      freeProjects: effectiveFreeProjects,
      activeProjectCount,
      maxProjects: maxAllowed,
      canCreateProject,
      nextProjectPriceCents,
      trialStartedAt: tenant.trialStartedAt,
      trialMonths: trial.trialMonths,
      trialInterruptedAt: trial.trialInterruptedAt,
      trialEndDate,
      trialActive,
      trialExpired,
      isOnFreeTier,
      requiresSubscription,
      billingInteractionAllowed
    };
  }

  // ─── BILLING STATUS CHECK ──────────────────────────────

  async checkBillingAccess(
    tenantId: string
  ): Promise<{ allowed: boolean; warning: boolean; reason?: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return { allowed: false, warning: false, reason: 'Tenant not found' };
    }

    switch (tenant.billingStatus) {
      case BillingStatus.OK:
        return { allowed: true, warning: false };

      case BillingStatus.GRACE_PERIOD:
        return {
          allowed: true,
          warning: true,
          reason: `Pagamento pendente. Regularize até ${tenant.gracePeriodEnd?.toLocaleDateString('pt-BR')} para evitar bloqueio.`
        };

      case BillingStatus.INADIMPLENTE:
        return {
          allowed: false,
          warning: false,
          reason:
            'Acesso bloqueado por inadimplência. Entre em contato com o suporte.'
        };

      case BillingStatus.CANCELLED:
        return {
          allowed: false,
          warning: false,
          reason: 'Assinatura cancelada.'
        };

      default:
        return {
          allowed: false,
          warning: false,
          reason: 'Status desconhecido'
        };
    }
  }

  // ─── ADMIN: LIST INVOICES ──────────────────────────────

  async listInvoices(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        trialStartedAt: true,
        trialMonths: true,
        trialInterruptedAt: true
      }
    });
    if (this.getTrialState(tenant).trialActive) return [];

    return this.prisma.billingInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  // ─── FIX EXISTING SUBSCRIPTIONS ────────────────────────

  async fixSubscriptionPaymentMethods(tenantId: string) {
    const localSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });

    if (!localSub?.stripeSubscriptionId) {
      throw new BadRequestException('No subscription found for this tenant');
    }

    const updated = await this.stripe.subscriptions.update(
      localSub.stripeSubscriptionId,
      {
        payment_settings: {
          payment_method_types: ['card', 'boleto']
        }
      }
    );

    this.logger.log(`Fixed payment methods for subscription ${updated.id}`);
    return {
      subscriptionId: updated.id,
      paymentMethodTypes: (updated.payment_settings as any)
        ?.payment_method_types
    };
  }
}
