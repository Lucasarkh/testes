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
import { PaymentProvider } from '@prisma/client';
import { NotificationsService } from '@modules/notifications/notifications.service';

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
    private readonly encryption: EncryptionService
  ) {}

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

  async startReservationPayment(
    leadId: string,
    amount: number,
    options?: { baseUrl?: string; metadata?: Record<string, any> }
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

    // 0. Check Lot availability
    if (lead.mapElement?.lotDetails) {
      if (lead.mapElement.lotDetails.status !== 'AVAILABLE') {
        throw new BadRequestException(
          'Este lote não está disponível para reserva.'
        );
      }
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
    const successUrl = `${siteUrl}/obrigado?paymentId=${leadPayment.id}`;
    const cancelUrl = `${siteUrl}/pagamento?leadId=${leadId}`;

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
      this.logger.error(`Error creating payment session: ${error.message}`);
      throw new BadRequestException('Error creating payment session');
    }
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

    if (!config || !config.isActive) {
      this.logger.warn(
        `Webhook received for inactive or non-existent project config for project: ${projectId}`
      );
      return { received: true };
    }

    const gateway = this.getGateway(provider);

    // Decrypt gateway credentials before passing to adapter.
    const keysJson = this.encryption.decryptJson(config.keysJson);
    if (!keysJson) {
      this.logger.warn(`Failed to decrypt keysJson for project: ${projectId}`);
      return { received: true }; // graceful — do not crash on bad config
    }

    try {
      const result = await gateway.handleWebhook(keysJson, payload, signature);

      if (result.status === WebhookPaymentStatus.PAID) {
        await this.handleSuccessfulPayment(result.externalId, provider);
      } else if (result.status === WebhookPaymentStatus.FAILED) {
        await this.handleFailedPayment(result.externalId, provider);
      }

      return { processed: true };
    } catch (err) {
      this.logger.error(`Error processing webhook: ${err.message}`);
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
