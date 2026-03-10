import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import {
  CreatePaymentDto,
  IPaymentGateway,
  PaymentGatewayResponse,
  PaymentWebhookResult,
  WebhookPaymentStatus
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class MercadoPagoAdapter implements IPaymentGateway {
  private readonly logger = new Logger(MercadoPagoAdapter.name);

  private getClient(accessToken: string): MercadoPagoConfig {
    return new MercadoPagoConfig({
      accessToken
    });
  }

  async createSession(
    keys: { accessToken: string },
    data: CreatePaymentDto
  ): Promise<PaymentGatewayResponse> {
    const client = this.getClient(keys.accessToken);
    const preference = new Preference(client);

    const body = {
      items: [
        {
          id: data.orderId,
          title: data.description,
          unit_price: Number(data.amount),
          quantity: 1,
          currency_id: data.currency.toUpperCase()
        }
      ],
      payer: {
        email: data.customerEmail,
        name: data.customerName
      },
      back_urls: {
        success: data.successUrl,
        failure: data.cancelUrl,
        pending: data.successUrl // Pending also success in MP context often
      },
      auto_return: 'approved',
      external_reference: data.orderId,
      notification_url: data.webhookUrl,
      metadata: data.metadata
    };

    const response = await preference.create({ body });

    // NOTE: We use data.orderId (external_reference) as externalId — not the preference ID —
    // because MP webhooks deliver Payment objects whose IDs differ from Preference IDs.
    // The external_reference is the only consistent identifier between create and webhook events.
    return {
      externalId: data.orderId, // = leadPayment.id, matches what external_reference points to
      paymentUrl: response.init_point! // For production
    };
  }

  async handleWebhook(
    keys: { accessToken: string; webhookSecret?: string },
    payload: any
  ): Promise<PaymentWebhookResult> {
    const client = this.getClient(keys.accessToken);
    const payment = new Payment(client);

    // Mercado Pago often sends a notification type + id
    // We fetch the payment details to ensure they are legitimate
    if (payload.type === 'payment') {
      const paymentData = await payment.get({ id: payload.data.id });

      let status = WebhookPaymentStatus.PENDING;
      if (paymentData.status === 'approved') {
        status = WebhookPaymentStatus.PAID;
      } else if (paymentData.status === 'rejected') {
        status = WebhookPaymentStatus.FAILED;
      } else if (paymentData.status === 'cancelled') {
        status = WebhookPaymentStatus.FAILED;
      } else if (paymentData.status === 'refunded') {
        status = WebhookPaymentStatus.REFUNDED;
      }

      // Use external_reference (= our leadPayment.id / orderId) as the lookup key.
      // The Preference.id and Payment.id are different — only external_reference is consistent.
      return {
        externalId:
          paymentData.external_reference || paymentData.id!.toString(),
        status,
        rawPayload: paymentData
      };
    }

    return {
      externalId: '',
      status: WebhookPaymentStatus.PENDING,
      rawPayload: payload
    };
  }
}
