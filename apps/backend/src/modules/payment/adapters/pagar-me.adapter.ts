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
export class PagarMeAdapter implements IPaymentGateway {
  private readonly logger = new Logger(PagarMeAdapter.name);
  private readonly baseUrl = 'https://api.pagar.me/core/v5';

  private getHeaders(secretKey: string) {
    const auth = Buffer.from(`${secretKey}:`).toString('base64');
    return {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  async createSession(
    keys: { secretKey: string },
    data: CreatePaymentDto
  ): Promise<PaymentGatewayResponse> {
    // Pagar.me v5 uses "Orders" to create a checkout/payment
    const response = await axios.post(
      `${this.baseUrl}/orders`,
      {
        customer: {
          name: data.customerName,
          email: data.customerEmail
        },
        items: [
          {
            amount: Math.round(data.amount * 100), // in cents
            description: data.description,
            quantity: 1,
            code: data.orderId
          }
        ],
        payments: [
          {
            payment_method: 'checkout',
            checkout: {
              expires_in: 120, // 2 hours
              billing_address_editable: true,
              customer_editable: false,
              accepted_payment_methods: ['credit_card', 'pix', 'boleto'],
              success_url: data.successUrl,
              skip_checkout_success_page: false
            }
          }
        ],
        metadata: data.metadata
      },
      { headers: this.getHeaders(keys.secretKey) }
    );

    // Pagar.me returns a checkout_url in the first payment object if using checkout
    const checkoutUrl = response.data.checkouts?.[0]?.payment_url;

    return {
      externalId: response.data.id,
      paymentUrl: checkoutUrl || ''
    };
  }

  async handleWebhook(
    keys: { secretKey: string },
    payload: any
  ): Promise<PaymentWebhookResult> {
    // Pagar.me webhooks use 'type' field
    const type = payload.type;
    const order = payload.data;

    let status = WebhookPaymentStatus.PENDING;

    if (type === 'order.paid') {
      status = WebhookPaymentStatus.PAID;
    } else if (type === 'order.payment_failed' || type === 'order.canceled') {
      status = WebhookPaymentStatus.FAILED;
    }

    return {
      externalId: order.id,
      status,
      rawPayload: payload
    };
  }
}
