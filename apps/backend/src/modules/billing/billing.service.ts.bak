import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/infra/db/prisma.service';
import { FeatureCode, BillingStatus } from '@prisma/client';
import {
  UpdateTenantFeaturesDto,
  CreateCustomerDto,
  SavePaymentMethodDto,
  UpsertFeatureCatalogDto,
  SubscriptionStatusDto,
  UpsertFeatureComboDto,
} from './dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;
  private readonly GRACE_PERIOD_DAYS = 15; // 15 dias conforme boas práticas CDC

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set — billing features disabled');
    }
    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  // ─── CUSTOMER MANAGEMENT ────────────────────────────────

  /**
   * Create or retrieve a Stripe Customer for a Tenant.
   */
  async ensureStripeCustomer(tenantId: string, dto?: CreateCustomerDto): Promise<string> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    if (tenant.stripeCustomerId) {
      // Verify customer still exists on Stripe
      try {
        await this.stripe.customers.retrieve(tenant.stripeCustomerId);
        return tenant.stripeCustomerId;
      } catch {
        this.logger.warn(`Stripe customer ${tenant.stripeCustomerId} not found, creating new`);
      }
    }

    const customer = await this.stripe.customers.create({
      name: dto?.name || tenant.name,
      email: dto?.email || tenant.billingEmail || undefined,
      metadata: { tenantId: tenant.id, tenantSlug: tenant.slug },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeCustomerId: customer.id,
        billingEmail: dto?.email || tenant.billingEmail,
      },
    });

    this.logger.log(`Created Stripe customer ${customer.id} for tenant ${tenantId}`);
    return customer.id;
  }

  // ─── PAYMENT METHODS ───────────────────────────────────

  /**
   * Attach a PaymentMethod (card, boleto, pix) to the customer and set as default.
   */
  async savePaymentMethod(tenantId: string, dto: SavePaymentMethodDto) {
    const customerId = await this.ensureStripeCustomer(tenantId);

    // Attach the PM to the customer
    await this.stripe.paymentMethods.attach(dto.paymentMethodId, {
      customer: customerId,
    });

    // Set as default for invoices
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: dto.paymentMethodId,
      },
    });

    this.logger.log(`Saved payment method ${dto.paymentMethodId} for tenant ${tenantId}`);
    return { success: true, paymentMethodId: dto.paymentMethodId };
  }

  /**
   * List payment methods for a customer.
   */
  async listPaymentMethods(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    if (!tenant.stripeCustomerId) return [];

    // Fetch saved payment method types (card + boleto)
    // Note: PIX is not a saveable payment method — it's used per-invoice
    const [cards, boletos] = await Promise.all([
      this.stripe.paymentMethods.list({ customer: tenant.stripeCustomerId, type: 'card' }),
      this.stripe.paymentMethods.list({ customer: tenant.stripeCustomerId, type: 'boleto' }),
    ]);

    const result: any[] = [];

    for (const pm of cards.data) {
      result.push({
        id: pm.id,
        type: 'card',
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      });
    }

    for (const pm of boletos.data) {
      result.push({
        id: pm.id,
        type: 'boleto',
        brand: 'boleto',
        last4: (pm.boleto as any)?.tax_id?.slice(-4) || '****',
      });
    }

    return result;
  }

  // ─── FEATURE CATALOG (SYSADMIN) ────────────────────────

  async upsertFeatureCatalog(dto: UpsertFeatureCatalogDto) {
    // Ensure Stripe Product + Price exist
    let stripeProductId: string | undefined;
    let stripePriceId: string | undefined;

    const existing = await this.prisma.featureCatalog.findUnique({
      where: { code: dto.code },
    });

    if (existing?.stripeProductId) {
      stripeProductId = existing.stripeProductId;
      // Update product name if changed
      await this.stripe.products.update(stripeProductId, { name: dto.name });
    } else {
      const product = await this.stripe.products.create({
        name: dto.name,
        metadata: { featureCode: dto.code },
      });
      stripeProductId = product.id;
    }

    // Always create a new price (Stripe prices are immutable)
    if (dto.defaultPriceCents > 0) {
      const price = await this.stripe.prices.create({
        product: stripeProductId,
        unit_amount: dto.defaultPriceCents,
        currency: 'brl',
        recurring: { interval: 'month' },
      });
      stripePriceId = price.id;
    }

    return this.prisma.featureCatalog.upsert({
      where: { code: dto.code },
      create: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        defaultPriceCents: dto.defaultPriceCents,
        stripeProductId,
        stripePriceId,
      },
      update: {
        name: dto.name,
        description: dto.description,
        defaultPriceCents: dto.defaultPriceCents,
        stripeProductId,
        stripePriceId,
      },
    });
  }

  async listFeatureCatalog() {
    return this.prisma.featureCatalog.findMany({
      orderBy: { code: 'asc' },
    });
  }

  // ─── FEATURE COMBOS (SYSADMIN) ─────────────────────────

  async upsertFeatureCombo(dto: UpsertFeatureComboDto) {
    const data = {
      name: dto.name,
      description: dto.description,
      discountPercent: dto.discountPercent ?? 0,
    };

    let combo: any;
    if (dto.id) {
      combo = await this.prisma.featureCombo.update({
        where: { id: dto.id },
        data,
      });
      // Replace items
      await this.prisma.featureComboItem.deleteMany({ where: { comboId: combo.id } });
    } else {
      combo = await this.prisma.featureCombo.create({ data });
    }

    // Create items
    for (const item of dto.items) {
      await this.prisma.featureComboItem.create({
        data: {
          comboId: combo.id,
          featureCode: item.featureCode,
          overridePriceCents: item.overridePriceCents,
        },
      });
    }

    return this.prisma.featureCombo.findUniqueOrThrow({
      where: { id: combo.id },
      include: { items: true },
    });
  }

  async listFeatureCombos() {
    return this.prisma.featureCombo.findMany({
      where: { isActive: true },
      include: { items: true },
      orderBy: { name: 'asc' },
    });
  }

  async deleteFeatureCombo(comboId: string) {
    await this.prisma.featureCombo.update({
      where: { id: comboId },
      data: { isActive: false },
    });
    return { message: 'Combo deactivated' };
  }

  /**
   * Apply a combo to a tenant — resolves the combo items to features
   * and calls updateTenantFeatures with the combo's pre-set configuration.
   */
  async applyComboToTenant(tenantId: string, comboId: string) {
    const combo = await this.prisma.featureCombo.findUniqueOrThrow({
      where: { id: comboId },
      include: { items: true },
    });

    const catalog = await this.prisma.featureCatalog.findMany();
    const catalogMap = new Map(catalog.map((c) => [c.code, c]));

    // Build features from combo items
    const features = combo.items.map((item) => {
      const cat = catalogMap.get(item.featureCode);
      const basePriceCents = item.overridePriceCents ?? cat?.defaultPriceCents ?? 0;
      // Apply combo discount
      const discountedPrice = combo.discountPercent > 0
        ? Math.round(basePriceCents * (1 - combo.discountPercent / 100))
        : basePriceCents;

      return {
        featureCode: item.featureCode,
        isActive: true,
        customPriceCents: discountedPrice !== (cat?.defaultPriceCents ?? 0) ? discountedPrice : undefined,
      };
    });

    // Use existing updateTenantFeatures with comboId
    const dto: UpdateTenantFeaturesDto = { features, comboId };
    return this.updateTenantFeatures(tenantId, dto);
  }

  // ─── SUBSCRIPTION MANAGEMENT ───────────────────────────

  /**
   * SysAdmin: set which features a tenant has, with optional custom pricing.
   * This creates/updates the Stripe Subscription with one SubscriptionItem per feature.
   */
  async updateTenantFeatures(tenantId: string, dto: UpdateTenantFeaturesDto) {
    const customerId = await this.ensureStripeCustomer(tenantId);

    // Get or create local subscription record
    let localSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { items: true },
    });

    // Resolve catalog prices for each feature
    const catalog = await this.prisma.featureCatalog.findMany();
    const catalogMap = new Map(catalog.map((c) => [c.code, c]));

    // Build Stripe subscription items
    const stripeItems: Stripe.SubscriptionCreateParams.Item[] = [];
    for (const feat of dto.features) {
      if (feat.isActive === false) continue;

      const cat = catalogMap.get(feat.featureCode);
      if (!cat) {
        throw new BadRequestException(`Feature ${feat.featureCode} not found in catalog`);
      }

      // If custom price, create an inline price; otherwise use catalog default
      if (feat.customPriceCents !== undefined && feat.customPriceCents !== null) {
        const price = await this.stripe.prices.create({
          product: cat.stripeProductId!,
          unit_amount: feat.customPriceCents,
          currency: 'brl',
          recurring: { interval: 'month' },
        });
        stripeItems.push({ price: price.id, quantity: 1 });
      } else if (cat.stripePriceId) {
        stripeItems.push({ price: cat.stripePriceId, quantity: 1 });
      }
    }

    if (stripeItems.length === 0) {
      // No active features — cancel subscription if exists
      if (localSub?.stripeSubscriptionId) {
        await this.stripe.subscriptions.cancel(localSub.stripeSubscriptionId);
        await this.prisma.tenantSubscription.update({
          where: { tenantId },
          data: { status: 'canceled' },
        });
      }

      // Deactivate all local features
      await this.prisma.tenantFeature.updateMany({
        where: { tenantId },
        data: { isActive: false, deactivatedAt: new Date() },
      });

      return { message: 'All features deactivated, subscription canceled' };
    }

    let stripeSub: Stripe.Subscription;

    if (localSub?.stripeSubscriptionId) {
      // Update existing subscription — replace all items
      const existingSub = await this.stripe.subscriptions.retrieve(
        localSub.stripeSubscriptionId,
        { expand: ['items'] },
      );

      // Remove all existing items and add new ones
      const updateItems: Stripe.SubscriptionUpdateParams.Item[] = [];

      // Mark existing items for deletion
      for (const item of existingSub.items.data) {
        updateItems.push({ id: item.id, deleted: true });
      }
      // Add new items
      for (const newItem of stripeItems) {
        updateItems.push(newItem);
      }

      stripeSub = await this.stripe.subscriptions.update(
        localSub.stripeSubscriptionId,
        {
          items: updateItems,
          proration_behavior: 'create_prorations',
          payment_settings: {
            payment_method_types: ['card', 'boleto'],
          },
        },
      );
    } else {
      // Create new subscription
      const createParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: stripeItems,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card', 'boleto'],
        },
        expand: ['latest_invoice.payment_intent'],
      };

      // Custom billing anchor — use billingDay to compute next month's date
      if (localSub?.billingDay) {
        const anchorDate = this.computeNextBillingDate(localSub.billingDay);
        createParams.billing_cycle_anchor = Math.floor(anchorDate.getTime() / 1000);
      } else if (localSub?.billingCycleAnchor) {
        // Legacy: use stored DateTime
        createParams.billing_cycle_anchor = Math.floor(
          localSub.billingCycleAnchor.getTime() / 1000,
        );
      }

      stripeSub = await this.stripe.subscriptions.create(createParams);
    }

    // Sync local subscription record
    const subData: any = {
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status,
      currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
    };

    // Persist combo reference if provided
    if (dto.comboId !== undefined) {
      subData.comboId = dto.comboId;
    }

    if (localSub) {
      await this.prisma.tenantSubscription.update({
        where: { tenantId },
        data: subData,
      });
    } else {
      localSub = await this.prisma.tenantSubscription.create({
        data: { tenantId, ...subData },
        include: { items: true },
      });
    }

    // Sync subscription items + tenant features
    await this.prisma.tenantSubscriptionItem.deleteMany({
      where: { subscriptionId: localSub.id },
    });

    for (const feat of dto.features) {
      const stripeItem = stripeSub.items.data.find((si) => {
        const cat = catalogMap.get(feat.featureCode);
        return cat && si.price.product === cat.stripeProductId;
      });

      if (feat.isActive !== false) {
        await this.prisma.tenantSubscriptionItem.create({
          data: {
            subscriptionId: localSub.id,
            featureCode: feat.featureCode,
            stripeSubscriptionItemId: stripeItem?.id,
            stripePriceId: stripeItem?.price.id,
            customPriceCents: feat.customPriceCents,
            isActive: true,
          },
        });
      }

      // Update TenantFeature
      await this.prisma.tenantFeature.upsert({
        where: {
          tenantId_featureCode: { tenantId, featureCode: feat.featureCode },
        },
        create: {
          tenantId,
          featureCode: feat.featureCode,
          isActive: feat.isActive !== false,
          activatedAt: feat.isActive !== false ? new Date() : undefined,
        },
        update: {
          isActive: feat.isActive !== false,
          deactivatedAt: feat.isActive === false ? new Date() : null,
          activatedAt: feat.isActive !== false ? new Date() : undefined,
        },
      });
    }

    this.logger.log(`Updated features for tenant ${tenantId}: ${stripeSub.id}`);
    return {
      subscriptionId: stripeSub.id,
      status: stripeSub.status,
      items: stripeSub.items.data.map((i) => ({
        id: i.id,
        priceId: i.price.id,
        amount: i.price.unit_amount,
      })),
    };
  }

  // ─── BILLING CYCLE ANCHOR ──────────────────────────────

  /**
   * Define o dia do mês para cobrança (1-28).
   * O anchor é aplicado:
   * - Na próxima criação de assinatura (billing_cycle_anchor)
   * - Em assinaturas existentes via subscription_schedule (se necessário)
   *
   * Regras legais (CDC):
   * - Primeiro vencimento sempre no mês seguinte ao cadastro
   * - Dia 29/30/31 não aceito (usar 28 como máximo)
   * - Grace period de 15 dias antes de bloqueio
   */
  async setBillingAnchor(tenantId: string, billingDay: number) {
    if (billingDay < 1 || billingDay > 28) {
      throw new BadRequestException('O dia de vencimento deve estar entre 1 e 28.');
    }

    // Save the billing day locally
    await this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      create: { tenantId, billingDay },
      update: { billingDay },
    });

    // If there's an active Stripe subscription, schedule the anchor change
    const localSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (localSub?.stripeSubscriptionId) {
      try {
        // Use proration_behavior: none + trial_end to shift the next billing date
        // Calculate next occurrence of the billing day
        const nextBillingDate = this.computeNextBillingDate(billingDay);
        const nextBillingTimestamp = Math.floor(nextBillingDate.getTime() / 1000);

        await this.stripe.subscriptions.update(localSub.stripeSubscriptionId, {
          trial_end: nextBillingTimestamp,
          proration_behavior: 'none',
        });

        this.logger.log(
          `Updated billing anchor for tenant ${tenantId}: day ${billingDay}, next billing ${nextBillingDate.toISOString()}`,
        );
      } catch (err) {
        this.logger.warn(
          `Could not reschedule Stripe subscription for tenant ${tenantId}: ${err.message}. ` +
          `Billing day saved locally and will be applied on next subscription update.`,
        );
      }
    }

    return {
      message: 'Dia de vencimento atualizado',
      billingDay,
      nextBillingDate: this.computeNextBillingDate(billingDay).toISOString(),
    };
  }

  /**
   * Compute the next occurrence of a billing day.
   * If today is before or equal to the billing day this month, use next month.
   * First billing is always pushed to the next month (regra CDC).
   */
  private computeNextBillingDate(billingDay: number): Date {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Always push to next month minimum (first charge = next month)
    let targetMonth = currentMonth + 1;
    let targetYear = currentYear;

    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }

    // Ensure the day is valid for the target month
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const safeDay = Math.min(billingDay, daysInMonth);

    return new Date(targetYear, targetMonth, safeDay, 12, 0, 0); // noon to avoid timezone issues
  }

  // ─── CHECKOUT SESSION ──────────────────────────────────

  /**
   * Create a Stripe Checkout Session (for the tenant to manage payment methods
   * or complete the first subscription payment).
   */
  async createCheckoutSession(
    tenantId: string,
    successUrl?: string,
    cancelUrl?: string,
  ) {
    const customerId = await this.ensureStripeCustomer(tenantId);
    const baseDomain = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const localSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!localSub?.stripeSubscriptionId) {
      throw new BadRequestException(
        'No subscription found. Ask admin to configure features first.',
      );
    }

    // Create a setup-mode session to collect payment method
    // Note: setup mode only supports card (boleto/pix are one-time payment methods)
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: successUrl || `${baseDomain}/painel/assinatura?status=success`,
      cancel_url: cancelUrl || `${baseDomain}/painel/assinatura?status=cancel`,
      metadata: { tenantId },
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Create a portal session where the customer can manage billing.
   */
  async createPortalSession(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    if (!tenant.stripeCustomerId) {
      throw new BadRequestException('Stripe customer not configured');
    }

    // Ensure a portal configuration exists that allows boleto
    const portalConfig = await this.getOrCreatePortalConfiguration();

    const baseDomain = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${baseDomain}/painel/assinatura`,
      configuration: portalConfig,
    });

    return { url: session.url };
  }

  /**
   * Get or create a Stripe billing portal configuration with boleto enabled.
   */
  private portalConfigId: string | null = null;
  private async getOrCreatePortalConfiguration(): Promise<string> {
    if (this.portalConfigId) return this.portalConfigId;

    try {
      // Try to find an existing active configuration
      const configs = await this.stripe.billingPortal.configurations.list({ limit: 1 });
      if (configs.data.length > 0) {
        this.portalConfigId = configs.data[0].id;
        // Update it to ensure boleto + card are enabled
        await this.stripe.billingPortal.configurations.update(this.portalConfigId, {
          features: {
            payment_method_update: {
              enabled: true,
            },
            invoice_history: { enabled: true },
          },
          business_profile: {
            headline: 'Gerencie sua assinatura Lotio',
          },
        });
        return this.portalConfigId;
      }

      // Create a new portal configuration
      const config = await this.stripe.billingPortal.configurations.create({
        features: {
          payment_method_update: {
            enabled: true,
          },
          invoice_history: { enabled: true },
        },
        business_profile: {
          headline: 'Gerencie sua assinatura Lotio',
        },
      });
      this.portalConfigId = config.id;
      return this.portalConfigId;
    } catch (err) {
      this.logger.warn(`Failed to create portal config: ${err.message}`);
      // Fall back to default config
      return undefined as any;
    }
  }

  // ─── WEBHOOK HANDLING ──────────────────────────────────

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret!);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        this.logger.debug(`Unhandled webhook event: ${event.type}`);
    }

    return { received: true };
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription
      ? typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : (invoice as any).subscription?.id
      : null;

    if (!subscriptionId) return;

    const localSub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!localSub) return;

    // Clear grace period, set billing status to OK
    await this.prisma.tenant.update({
      where: { id: localSub.tenantId },
      data: {
        billingStatus: BillingStatus.OK,
        gracePeriodEnd: null,
      },
    });

    // Record invoice
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
        attemptCount: invoice.attempt_count || 0,
      },
      update: {
        amountPaid: invoice.amount_paid,
        status: 'paid',
        paidAt: new Date(),
        attemptCount: invoice.attempt_count || 0,
      },
    });

    this.logger.log(`Invoice ${invoice.id} paid for tenant ${localSub.tenantId}`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription
      ? typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : (invoice as any).subscription?.id
      : null;

    if (!subscriptionId) return;

    const localSub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!localSub) return;

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: localSub.tenantId },
    });

    const now = new Date();

    if (tenant.billingStatus === BillingStatus.OK) {
      // First failure — enter grace period (5 days tolerance)
      const graceEnd = new Date(now);
      graceEnd.setDate(graceEnd.getDate() + this.GRACE_PERIOD_DAYS);

      await this.prisma.tenant.update({
        where: { id: localSub.tenantId },
        data: {
          billingStatus: BillingStatus.GRACE_PERIOD,
          gracePeriodEnd: graceEnd,
        },
      });

      this.logger.warn(
        `Payment failed for tenant ${localSub.tenantId}. Grace period until ${graceEnd.toISOString()}`,
      );
    } else if (
      tenant.billingStatus === BillingStatus.GRACE_PERIOD &&
      tenant.gracePeriodEnd &&
      now > tenant.gracePeriodEnd
    ) {
      // Grace period expired → block tenant
      await this.prisma.tenant.update({
        where: { id: localSub.tenantId },
        data: { billingStatus: BillingStatus.INADIMPLENTE },
      });

      this.logger.error(`Tenant ${localSub.tenantId} marked as INADIMPLENTE`);
    }

    // Record invoice
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
        lastAttemptAt: now,
      },
      update: {
        status: 'open',
        attemptCount: invoice.attempt_count || 0,
        lastAttemptAt: now,
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const localSub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!localSub) return;

    await this.prisma.tenantSubscription.update({
      where: { id: localSub.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000,
        ),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const localSub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!localSub) return;

    await this.prisma.tenantSubscription.update({
      where: { id: localSub.id },
      data: { status: 'canceled' },
    });

    // Deactivate all features
    await this.prisma.tenantFeature.updateMany({
      where: { tenantId: localSub.tenantId },
      data: { isActive: false, deactivatedAt: new Date() },
    });
  }

  // ─── GRACE PERIOD CRON ─────────────────────────────────

  /**
   * Called by a scheduled job to check grace periods and mark tenants as INADIMPLENTE.
   */
  async checkGracePeriods() {
    const now = new Date();

    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        billingStatus: BillingStatus.GRACE_PERIOD,
        gracePeriodEnd: { lt: now },
      },
    });

    for (const tenant of expiredTenants) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { billingStatus: BillingStatus.INADIMPLENTE },
      });
      this.logger.error(`Tenant ${tenant.id} (${tenant.name}) grace period expired → INADIMPLENTE`);
    }

    if (expiredTenants.length > 0) {
      this.logger.warn(`Marked ${expiredTenants.length} tenant(s) as INADIMPLENTE`);
    }
  }

  // ─── SUBSCRIPTION STATUS ───────────────────────────────

  async getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatusDto> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        subscription: { include: { items: true, combo: true } },
        tenantFeatures: true,
      },
    });

    const catalog = await this.prisma.featureCatalog.findMany();
    const catalogMap = new Map(catalog.map((c) => [c.code, c]));

    const features = (tenant.subscription?.items || []).map((item) => {
      const cat = catalogMap.get(item.featureCode);
      const priceCents = item.customPriceCents ?? cat?.defaultPriceCents ?? 0;
      return {
        featureCode: item.featureCode,
        isActive: item.isActive,
        customPriceCents: item.customPriceCents,
        catalogName: cat?.name || item.featureCode,
        priceCents,
      };
    });

    const totalMonthlyCents = features
      .filter((f) => f.isActive)
      .reduce((sum, f) => sum + f.priceCents, 0);

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
            cancelAtPeriodEnd: tenant.subscription.cancelAtPeriodEnd,
          }
        : null,
      features,
      totalMonthlyCents,
      gracePeriodEnd: tenant.gracePeriodEnd,
      combo: tenant.subscription?.combo
        ? {
            id: tenant.subscription.combo.id,
            name: tenant.subscription.combo.name,
            description: tenant.subscription.combo.description ?? undefined,
            discountPercent: tenant.subscription.combo.discountPercent,
          }
        : undefined,
    };
  }

  // ─── FEATURE CHECK HELPER ──────────────────────────────

  /**
   * Check if a feature is accessible for a tenant.
   * Returns: { allowed: boolean, warning: boolean, reason?: string }
   */
  async checkFeatureAccess(
    tenantId: string,
    featureCode: FeatureCode,
  ): Promise<{ allowed: boolean; warning: boolean; reason?: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { allowed: false, warning: false, reason: 'Tenant not found' };
    }

    // SYSADMIN-owned tenants always have full access (optional — they might not be billed)
    // Check if feature is active
    const feature = await this.prisma.tenantFeature.findUnique({
      where: { tenantId_featureCode: { tenantId, featureCode } },
    });

    if (!feature || !feature.isActive) {
      return { allowed: false, warning: false, reason: `Feature ${featureCode} not active` };
    }

    // Check billing status
    switch (tenant.billingStatus) {
      case BillingStatus.OK:
        return { allowed: true, warning: false };

      case BillingStatus.GRACE_PERIOD:
        return {
          allowed: true,
          warning: true,
          reason: `Pagamento pendente. Regularize até ${tenant.gracePeriodEnd?.toLocaleDateString('pt-BR')} para evitar bloqueio.`,
        };

      case BillingStatus.INADIMPLENTE:
        return {
          allowed: false,
          warning: false,
          reason: 'Acesso bloqueado por inadimplência. Entre em contato com o suporte.',
        };

      case BillingStatus.CANCELLED:
        return {
          allowed: false,
          warning: false,
          reason: 'Assinatura cancelada.',
        };

      default:
        return { allowed: false, warning: false, reason: 'Status desconhecido' };
    }
  }

  // ─── ADMIN: LIST INVOICES ──────────────────────────────

  async listInvoices(tenantId: string) {
    return this.prisma.billingInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─── FIX EXISTING SUBSCRIPTIONS ────────────────────────

  /**
   * Patch an existing Stripe subscription to enable boleto payment method.
   * This is needed for subscriptions created before boleto was properly configured.
   */
  async fixSubscriptionPaymentMethods(tenantId: string) {
    const localSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!localSub?.stripeSubscriptionId) {
      throw new BadRequestException('No subscription found for this tenant');
    }

    const updated = await this.stripe.subscriptions.update(
      localSub.stripeSubscriptionId,
      {
        payment_settings: {
          payment_method_types: ['card', 'boleto'],
        },
      },
    );

    this.logger.log(`Fixed payment methods for subscription ${updated.id}`);
    return {
      subscriptionId: updated.id,
      paymentMethodTypes: (updated.payment_settings as any)?.payment_method_types,
    };
  }
}
