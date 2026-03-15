import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  CreatePaymentDto,
  IPaymentGateway,
  PaymentGatewayResponse,
  PaymentWebhookResult,
  WebhookPaymentStatus
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class StripeAdapter implements IPaymentGateway {
  private readonly logger = new Logger(StripeAdapter.name);

  private getPaymentMethodTypes(keys: {
    paymentMethodTypes?: unknown;
  }): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
    const allowed: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
      'card',
      'boleto',
      'pix'
    ];

    if (!Array.isArray(keys.paymentMethodTypes)) {
      return ['card'];
    }

    const sanitized = keys.paymentMethodTypes.filter(
      (
        method
      ): method is Stripe.Checkout.SessionCreateParams.PaymentMethodType =>
        typeof method === 'string' &&
        allowed.includes(
          method as Stripe.Checkout.SessionCreateParams.PaymentMethodType
        )
    );

    return sanitized.length > 0 ? sanitized : ['card'];
  }

  private getStripe(secretKey: string): Stripe {
    return new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia' as any // latest stable or dynamic
    });
  }

  async createSession(
    keys: { secretKey: string; paymentMethodTypes?: unknown },
    data: CreatePaymentDto
  ): Promise<PaymentGatewayResponse> {
    const stripe = this.getStripe(keys.secretKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: this.getPaymentMethodTypes(keys),
      line_items: [
        {
          price_data: {
            currency: data.currency.toLowerCase(),
            product_data: {
              name: data.description
            },
            unit_amount: Math.round(data.amount * 100) // Stripe expects cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      client_reference_id: data.orderId,
      customer_email: data.customerEmail,
      metadata: data.metadata
    });

    return {
      externalId: session.id,
      paymentUrl: session.url!
    };
  }

  async handleWebhook(
    keys: { secretKey: string; webhookSecret?: string },
    payload: any,
    signature?: string
  ): Promise<PaymentWebhookResult> {
    const stripe = this.getStripe(keys.secretKey);

    let event: Stripe.Event;

    if (signature && keys.webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(
          payload,
          signature,
          keys.webhookSecret
        );
      } catch (err) {
        this.logger.error(
          `Webhook signature verification failed: ${err.message}`
        );
        throw new Error('Invalid signature');
      }
    } else {
      // Insecure way (only for local dev or if secret is missing)
      event = payload as Stripe.Event;
    }

    let status = WebhookPaymentStatus.PENDING;
    let externalId = '';

    const session = event.data.object as Stripe.Checkout.Session;
    externalId = session.id;

    switch (event.type) {
      case 'checkout.session.completed':
        // session.payment_status === 'paid' → synchronous card payment confirmed
        // session.payment_status === 'unpaid' → boleto/PIX pending, wait for async event
        if (event.data.object.payment_status === 'paid') {
          status = WebhookPaymentStatus.PAID;
        }
        // else remain PENDING — confirmation comes via async_payment_succeeded
        break;
      case 'checkout.session.async_payment_succeeded':
        status = WebhookPaymentStatus.PAID;
        break;
      case 'checkout.session.async_payment_failed':
        status = WebhookPaymentStatus.FAILED;
        break;
      case 'checkout.session.expired':
        status = WebhookPaymentStatus.FAILED;
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return {
      externalId,
      status,
      rawPayload: event
    };
  }
}
