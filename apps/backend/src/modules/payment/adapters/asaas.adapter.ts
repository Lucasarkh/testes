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
export class AsaasAdapter implements IPaymentGateway {
  private readonly logger = new Logger(AsaasAdapter.name);
  private readonly baseUrl = 'https://www.asaas.com/api/v3'; // or sandbox url

  private getHeaders(apiKey: string) {
    return {
      access_token: apiKey,
      'Content-Type': 'application/json'
    };
  }

  async createSession(
    keys: { apiKey: string; isSandbox?: boolean },
    data: CreatePaymentDto
  ): Promise<PaymentGatewayResponse> {
    const url = keys.isSandbox
      ? 'https://sandbox.asaas.com/api/v3/payments'
      : `${this.baseUrl}/payments`;

    // Asaas needs a customer. In a real integration, we should search if customer exists
    // or create one. For simplicity in this pre-reservation, we create a one-time payment
    // or dynamic customer.

    // 1. Create/Find Customer (Simplified: creating every time for now or using a generic one)
    const customerResponse = await axios.post(
      keys.isSandbox
        ? 'https://sandbox.asaas.com/api/v3/customers'
        : `${this.baseUrl}/customers`,
      {
        name: data.customerName,
        email: data.customerEmail
      },
      { headers: this.getHeaders(keys.apiKey) }
    );

    const customerId = customerResponse.data.id;

    // 2. Create Payment
    const response = await axios.post(
      url,
      {
        customer: customerId,
        billingType: 'UNDEFINED', // Allows customer to choose
        value: data.amount,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        description: data.description,
        externalReference: data.orderId
      },
      { headers: this.getHeaders(keys.apiKey) }
    );

    return {
      externalId: response.data.id,
      paymentUrl: response.data.invoiceUrl
    };
  }

  async handleWebhook(
    keys: { apiKey: string },
    payload: any
  ): Promise<PaymentWebhookResult> {
    // Asaas webhooks: payload.event contains the event type
    const event = payload.event;
    const payment = payload.payment;

    if (!payment) {
      return {
        externalId: '',
        status: WebhookPaymentStatus.PENDING,
        rawPayload: payload
      };
    }

    let status = WebhookPaymentStatus.PENDING;

    if (
      event === 'PAYMENT_RECEIVED' ||
      event === 'PAYMENT_CONFIRMED' ||
      event === 'PAYMENT_ANTICIPATED'
    ) {
      status = WebhookPaymentStatus.PAID;
    } else if (
      event === 'PAYMENT_OVERDUE' ||
      event === 'PAYMENT_DELETED' ||
      event === 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
    ) {
      status = WebhookPaymentStatus.FAILED;
    } else if (
      event === 'PAYMENT_REFUNDED' ||
      event === 'PAYMENT_PARTIALLY_REFUNDED'
    ) {
      status = WebhookPaymentStatus.REFUNDED;
    }

    return {
      externalId: payment.id,
      status,
      rawPayload: payload
    };
  }
}
