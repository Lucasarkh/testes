import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { EncryptionService } from '@common/encryption/ecryption.service';
import { StripeAdapter } from './adapters/stripe.adapter';
import { MercadoPagoAdapter } from './adapters/mercado-pago.adapter';
import { AsaasAdapter } from './adapters/asaas.adapter';
import { PagarMeAdapter } from './adapters/pagar-me.adapter';
import { PagSeguroAdapter } from './adapters/pagseguro.adapter';
import {
  CreatePaymentDto,
  IPaymentGateway,
  WebhookPaymentStatus
} from './interfaces/payment-gateway.interface';
import {
  LeadStatus,
  PaymentProvider,
  PreLaunchCaptureMode,
  Prisma
} from '@prisma/client';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { PurchaseFlowService } from '@modules/purchase-flow/purchase-flow.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeAdapter,
    private readonly mercadoPago: MercadoPagoAdapter,
    private readonly asaas: AsaasAdapter,
    private readonly pagarMe: PagarMeAdapter,
    private readonly pagSeguro: PagSeguroAdapter,
    private readonly notifications: NotificationsService,
    private readonly encryption: EncryptionService,
    private readonly purchaseFlow: PurchaseFlowService
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null) {
      const maybeError = error as {
        message?: unknown;
        response?: {
          data?: unknown;
        };
      };

      if (typeof maybeError.response?.data === 'string') {
        return maybeError.response.data;
      }

      if (
        typeof maybeError.response?.data === 'object' &&
        maybeError.response?.data !== null
      ) {
        const responseData = maybeError.response.data as Record<string, unknown>;

        for (const key of ['message', 'error_description', 'description']) {
          if (typeof responseData[key] === 'string') {
            return responseData[key] as string;
          }
        }
      }

      if (typeof maybeError.message === 'string') {
        return maybeError.message;
      }
    }

    return 'Erro desconhecido ao criar sessão de pagamento';
  }

  private getGateway(provider: PaymentProvider): IPaymentGateway {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return this.stripe;
      case PaymentProvider.MERCADO_PAGO:
        return this.mercadoPago;
      case PaymentProvider.ASAAS:
        return this.asaas;
      case PaymentProvider.PAGAR_ME:
        return this.pagarMe;
      case PaymentProvider.PAGSEGURO:
        return this.pagSeguro;
      default:
        throw new BadRequestException('Payment provider not supported yet');
    }
  }

  private async findActiveReservationConflictByContact(
    tx: Prisma.TransactionClient,
    tenantId: string,
    leadLike: {
      id?: string | null;
      cpf?: string | null;
      email?: string | null;
      phone?: string | null;
    }
  ) {
    const identityFilters: Prisma.LeadWhereInput[] = [];

    if (leadLike.cpf) identityFilters.push({ cpf: leadLike.cpf });
    if (leadLike.email) {
      identityFilters.push({
        email: { equals: leadLike.email, mode: 'insensitive' as any }
      });
    }
    if (leadLike.phone) identityFilters.push({ phone: leadLike.phone });

    if (!identityFilters.length) return null;

    return tx.lead.findFirst({
      where: {
        tenantId,
        status: LeadStatus.RESERVATION,
        ...(leadLike.id ? { id: { not: leadLike.id } } : {}),
        OR: identityFilters
      },
      select: {
        id: true,
        project: { select: { name: true } },
        mapElement: { select: { code: true, name: true } }
      }
    });
  }

  private buildReservationConflictMessage(conflict: {
    project?: { name?: string | null } | null;
    mapElement?: { code?: string | null; name?: string | null } | null;
  }) {
    const lotLabel = conflict.mapElement?.code || conflict.mapElement?.name;
    const projectLabel = conflict.project?.name;

    if (lotLabel && projectLabel) {
      return `Este cliente já possui uma reserva ativa para o lote ${lotLabel} em ${projectLabel}.`;
    }

    if (lotLabel) {
      return `Este cliente já possui uma reserva ativa para o lote ${lotLabel}.`;
    }

    return 'Este cliente já possui uma reserva ativa em andamento.';
  }

  async startReservationPayment(
    leadId: string,
    amount: number,
    options?: {
      baseUrl?: string;
      returnPath?: string;
      metadata?: Record<string, any>;
    }
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        mapElement: {
          include: { lotDetails: true }
        },
        project: {
          include: {
            paymentGateways: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!lead || !lead.project) {
      throw new NotFoundException('Lead or Project not found');
    }

    if (
      lead.project.preLaunchEnabled &&
      lead.project.preLaunchCaptureMode !== PreLaunchCaptureMode.RESERVATION
    ) {
      throw new BadRequestException(
        'Este empreendimento está em pré-lançamento com fila de preferência ativa.'
      );
    }

    await this.purchaseFlow.ensureProcessForLead(leadId);

    // 0. Check Lot availability
    if (lead.mapElement?.lotDetails) {
      if (lead.mapElement.lotDetails.status !== 'AVAILABLE') {
        throw new BadRequestException(
          'Este lote não está disponível para reserva.'
        );
      }
    }

    const reservationConflict = await this.prisma.$transaction((tx) =>
      this.findActiveReservationConflictByContact(tx, lead.tenantId, {
        id: lead.id,
        cpf: lead.cpf || null,
        email: lead.email || null,
        phone: lead.phone || null
      })
    );

    if (reservationConflict) {
      throw new BadRequestException(
        this.buildReservationConflictMessage(reservationConflict)
      );
    }

    const gateways = lead.project.paymentGateways;

    if (!gateways || gateways.length === 0) {
      throw new BadRequestException(
        'Payment gateway not configured for this project'
      );
    }

    // PIX_DIRECT is a manual flow — skip it when looking for a gateway that creates a session automatically
    const activeGatewayConfig = gateways.find(
      (g: any) => g.provider !== 'PIX_DIRECT'
    );
    if (!activeGatewayConfig) {
      throw new BadRequestException(
        'Nenhum gateway de pagamento automático configurado. Configure Stripe, Asaas, Mercado Pago, Pagar.me ou PagSeguro.'
      );
    }

    const { provider, keysJson: rawKeysJson } = activeGatewayConfig;
    const gateway = this.getGateway(provider);

    // Decrypt the gateway credentials for in-memory use only.
    const keysJson = this.encryption.decryptJson(rawKeysJson);
    if (!keysJson) {
      throw new BadRequestException(
        'Não foi possível decriptografar as credenciais do gateway. ' +
          'Por favor, reconfigure o gateway de pagamento no painel.'
      );
    }

    // Create a record in our database
    const leadPayment = await this.prisma.leadPayment.create({
      data: {
        leadId: lead.id,
        type: 'RESERVATION_FEE',
        status: 'PENDING',
        amount,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h to pay
        provider
      }
    });

    const siteUrl =
      options?.baseUrl ||
      `https://${lead.project.customDomain || 'demo.lotio.com.br'}`;
    const normalizedReturnPath = this.normalizeReturnPath(
      options?.returnPath,
      lead.project.slug,
      lead.mapElement?.code || lead.mapElement?.name || undefined
    );
    const successUrl = `${siteUrl}${normalizedReturnPath}?payment=success&paymentId=${leadPayment.id}`;
    const cancelUrl = `${siteUrl}${normalizedReturnPath}?payment=cancelled&leadId=${leadId}`;

    // Improve description with Lot information
    const lotInfo = lead.mapElement
      ? ` - Lote ${lead.mapElement.code || lead.mapElement.name}`
      : '';
    const description = `Reserva${lotInfo} - [${lead.project.name || 'Loteamento'}]`;

    const sessionData: CreatePaymentDto = {
      amount,
      currency: 'BRL',
      orderId: leadPayment.id,
      customerName: lead.name,
      customerEmail: lead.email || '',
      description: description,
      successUrl,
      cancelUrl,
      webhookUrl: `${siteUrl}/api/webhooks/${provider.toLowerCase()}/${lead.projectId}`,
      metadata: {
        leadId,
        paymentId: leadPayment.id,
        projectId: lead.projectId,
        returnPath: normalizedReturnPath,
        ...options?.metadata
      }
    };

    try {
      const { externalId, paymentUrl } = await gateway.createSession(
        keysJson,
        sessionData
      );

      // Update lead payment with gateway details
      await this.prisma.leadPayment.update({
        where: { id: leadPayment.id },
        data: {
          externalId,
          paymentUrl
        }
      });

      // Update lead status
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { status: 'WAITING_PAYMENT' }
      });

      return {
        paymentId: leadPayment.id,
        checkoutUrl: paymentUrl
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Error creating payment session: ${message}`);
      throw new BadRequestException(message);
    }
  }

  private normalizeReturnPath(
    returnPath: string | undefined,
    projectSlug: string,
    lotCode?: string
  ): string {
    if (returnPath && returnPath.startsWith('/')) {
      return returnPath;
    }

    if (lotCode) {
      return `/${projectSlug}/${encodeURIComponent(lotCode)}`;
    }

    return `/${projectSlug}`;
  }

  async getReservationStatus(paymentId: string) {
    const payment = await this.prisma.leadPayment.findUnique({
      where: { id: paymentId },
      include: {
        lead: {
          include: {
            project: {
              include: {
                paymentGateways: {
                  where: { isActive: true }
                }
              }
            },
            mapElement: true
          }
        }
      }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    let effectiveStatus = payment.status;
    let effectiveLeadStatus = payment.lead.status;

    if (
      payment.status !== 'PAID' &&
      payment.provider === PaymentProvider.STRIPE &&
      payment.externalId
    ) {
      const gatewayConfig = payment.lead.project.paymentGateways.find(
        (gateway) => gateway.provider === PaymentProvider.STRIPE
      );

      if (gatewayConfig?.keysJson) {
        const keysJson = this.encryption.decryptJson(gatewayConfig.keysJson);

        if (keysJson) {
          const status = await this.stripe.getCheckoutStatus(
            keysJson as { secretKey: string },
            payment.externalId
          );

          if (status === WebhookPaymentStatus.PAID) {
            await this.handleSuccessfulPayment(
              payment.externalId,
              PaymentProvider.STRIPE
            );

            const refreshedPayment = await this.prisma.leadPayment.findUnique({
              where: { id: paymentId },
              include: {
                lead: {
                  include: {
                    project: true,
                    mapElement: true
                  }
                }
              }
            });

            if (refreshedPayment) {
              effectiveStatus = refreshedPayment.status;
              effectiveLeadStatus = refreshedPayment.lead.status;
            }
          }
        }
      }
    }

    const lotCode = payment.lead.mapElement?.code || payment.lead.mapElement?.name;
    const returnPath = this.normalizeReturnPath(
      undefined,
      payment.lead.project.slug,
      lotCode || undefined
    );

    return {
      paymentId: payment.id,
      status: effectiveStatus,
      leadStatus: effectiveLeadStatus,
      returnPath,
      ...(effectiveStatus === 'PAID'
        ? await this.purchaseFlow.createAccessSessionForLead(payment.leadId)
        : {})
    };
  }

  async processWebhook(
    projectId: string,
    payload: any,
    provider: PaymentProvider,
    signature?: string
  ) {
    const config = await this.prisma.paymentConfig.findFirst({
      where: {
        provider,
        projects: {
          some: { id: projectId }
        }
      }
    });

    if (!config) {
      this.logger.warn(
        `Webhook received for inactive or non-existent project config for project: ${projectId}`
      );
      return { received: true }; // graceful — do not crash on bad config
    }

    const gateway = this.getGateway(provider);
    const keysJson = this.encryption.decryptJson(config.keysJson);
    if (!keysJson) {
      this.logger.warn(`Failed to decrypt keysJson for project: ${projectId}`);
      return { received: true }; // graceful — do not crash on bad config
    }

    const gatewayKeys = config.webhookSecret
      ? {
          ...keysJson,
          webhookSecret: config.webhookSecret
        }
      : keysJson;

    try {
      const result = await gateway.handleWebhook(
        gatewayKeys,
        payload,
        signature
      );

      if (result.status === WebhookPaymentStatus.PAID) {
        await this.handleSuccessfulPayment(result.externalId, provider);
      } else if (result.status === WebhookPaymentStatus.FAILED) {
        await this.handleFailedPayment(result.externalId, provider);
      }

      return { processed: true };
    } catch (err) {
      this.logger.error(
        `Error processing webhook: ${this.getErrorMessage(err)}`
      );
      throw err;
    }
  }

  private async handleSuccessfulPayment(
    externalId: string,
    provider: PaymentProvider
  ) {
    const payment = await this.prisma.leadPayment.findFirst({
      where: { externalId, provider },
      include: {
        lead: { include: { mapElement: { include: { lotDetails: true } } } }
      }
    });

    if (!payment) return;

    if (payment.status === 'PAID') return; // Already processed

    await this.prisma.$transaction(async (tx) => {
      const reservationConflict = await this.findActiveReservationConflictByContact(
        tx,
        payment.lead.tenantId,
        {
          id: payment.leadId,
          cpf: payment.lead.cpf || null,
          email: payment.lead.email || null,
          phone: payment.lead.phone || null
        }
      );

      if (reservationConflict) {
        throw new BadRequestException(
          this.buildReservationConflictMessage(reservationConflict)
        );
      }

      // 1. Mark payment as PAID
      await tx.leadPayment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidDate: new Date()
        }
      });

      // 2. Mark Lead as RESERVATION
      await tx.lead.update({
        where: { id: payment.leadId },
        data: {
          status: 'RESERVATION',
          reservedAt: new Date() // Set reservation time when payment is confirmed
        }
      });

      // 3. Update Lot status to RESERVED if applicable
      if (payment.lead.mapElementId && payment.lead.mapElement?.lotDetails) {
        // Double-check availability inside transaction to prevent race conditions
        const currentLot = await tx.lotDetails.findUnique({
          where: { id: payment.lead.mapElement.lotDetails.id }
        });

        if (currentLot && currentLot.status === 'AVAILABLE') {
          // Check if there's any other lead that somehow reserved it (race condition during webhook)
          const otherActiveLead = await tx.lead.findFirst({
            where: {
              mapElementId: payment.lead.mapElementId,
              status: { in: ['RESERVATION', 'WON'] },
              id: { not: payment.leadId }
            }
          });

          if (!otherActiveLead) {
            await tx.lotDetails.update({
              where: { id: currentLot.id },
              data: { status: 'RESERVED' }
            });
          } else {
            this.logger.error(
              `CONFLITO: Lote ${payment.lead.mapElementId} pago pelo lead ${payment.leadId}, mas já está reservado por outro lead (${otherActiveLead.id}).`
            );
            // In this case, we might need a manual intervention or a refund logic, but for now we block the update to lot status.
          }
        } else if (currentLot?.status === 'RESERVED') {
          // Check if it's already reserved for THIS lead
          const activeLead = await tx.lead.findFirst({
            where: {
              mapElementId: payment.lead.mapElementId,
              status: { in: ['RESERVATION', 'WON'] },
              id: { not: payment.leadId }
            }
          });
          if (activeLead) {
            this.logger.error(
              `CONFLITO: Lote ${payment.lead.mapElementId} pago, mas já ocupado.`
            );
          }
        }
      }

      // 4. Create History
      await tx.leadHistory.create({
        data: {
          leadId: payment.leadId,
          fromStatus: payment.lead.status,
          toStatus: 'RESERVATION',
          notes: `Pagamento de reserva confirmado via ${provider}`,
          createdBy: 'SYSTEM_GATEWAY'
        }
      });
    });

    this.notifications
      .onLeadReservationConfirmed(payment.leadId, provider)
      .catch((e) =>
        this.logger.error(
          'Notification onLeadReservationConfirmed (gateway)',
          e.message
        )
      );

    await this.purchaseFlow.activateReservationPaymentConfirmed(payment.leadId);
  }

  private async handleFailedPayment(
    externalId: string,
    provider: PaymentProvider
  ) {
    // Logic for failed payment
    const payment = await this.prisma.leadPayment.findFirst({
      where: { externalId, provider },
      include: { lead: true }
    });

    if (payment) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Update Payment status
        await tx.leadPayment.update({
          where: { id: payment.id },
          data: { status: 'OVERDUE' }
        });

        // 2. Update Lead status
        await tx.lead.update({
          where: { id: payment.leadId },
          data: { status: 'ABANDONED' }
        });

        // 3. Add History
        await tx.leadHistory.create({
          data: {
            leadId: payment.leadId,
            fromStatus: payment.lead.status,
            toStatus: 'ABANDONED',
            notes: `Pagamento de reserva falhou ou expirou via ${provider}`,
            createdBy: 'SYSTEM_GATEWAY'
          }
        });
      });
    }
  }

  async markAsAbandoned(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead || lead.status === 'WON' || lead.status === 'RESERVATION') {
      return { success: false };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'ABANDONED' }
      });

      await tx.leadHistory.create({
        data: {
          leadId,
          fromStatus: lead.status,
          toStatus: 'ABANDONED',
          notes: 'Lead retornou da tela de checkout e cancelou o processo',
          createdBy: 'CUSTOMER'
        }
      });
    });

    return { success: true };
  }
}
