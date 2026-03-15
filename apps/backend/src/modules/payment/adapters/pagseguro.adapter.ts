import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  CreatePaymentDto,
  IPaymentGateway,
  PaymentGatewayResponse,
  PaymentWebhookResult,
  WebhookPaymentStatus
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class PagSeguroAdapter implements IPaymentGateway {
  private readonly logger = new Logger(PagSeguroAdapter.name);
  private readonly baseUrl = 'https://api.pagseguro.com'; // or sandbox.api.pagseguro.com

  private getHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createSession(
    keys: { token: string; isSandbox?: boolean },
    data: CreatePaymentDto
  ): Promise<PaymentGatewayResponse> {
    const url = keys.isSandbox
      ? `https://sandbox.api.pagseguro.com/checkouts`
      : `${this.baseUrl}/checkouts`;

    const response = await axios.post(
      url,
      {
        reference_id: data.orderId,
        customer: {
          name: data.customerName,
          email: data.customerEmail
        },
        items: [
          {
            reference_id: data.orderId,
            name: data.description,
            quantity: 1,
            unit_amount: Math.round(data.amount * 100) // in cents
          }
        ],
        redirect_url: data.successUrl,
        notification_urls: data.webhookUrl ? [data.webhookUrl] : [],
        payment_methods: [
          { type: 'CREDIT_CARD' },
          { type: 'BOLETO' },
          { type: 'PIX' }
        ]
      },
      { headers: this.getHeaders(keys.token) }
    );

    // PagSeguro returns links for redirect
    const checkoutLink = response.data.links.find(
      (l: any) => l.rel === 'PAY'
    )?.href;

    return {
      externalId: data.orderId,
      paymentUrl: checkoutLink || ''
    };
  }

  async handleWebhook(
    keys: { token: string },
    payload: any
  ): Promise<PaymentWebhookResult> {
    // PagSeguro sends status change notifications
    const statusMapping: Record<string, WebhookPaymentStatus> = {
      PAID: WebhookPaymentStatus.PAID,
      COMPLETE: WebhookPaymentStatus.PAID, // fully delivered payment
      AUTHORIZED: WebhookPaymentStatus.PENDING,
      IN_ANALYSIS: WebhookPaymentStatus.PENDING,
      WAITING: WebhookPaymentStatus.PENDING,
      DECLINED: WebhookPaymentStatus.FAILED,
      CANCELED: WebhookPaymentStatus.FAILED,
      REFUNDED: WebhookPaymentStatus.REFUNDED
    };

    const rawStatus = payload.charges?.[0]?.status || payload.status;
    const status = statusMapping[rawStatus] || WebhookPaymentStatus.PENDING;

    const externalId =
      payload.reference_id || payload.charges?.[0]?.reference_id || payload.id || '';

    return {
      externalId,
      status,
      rawPayload: payload
    };
  }
}
