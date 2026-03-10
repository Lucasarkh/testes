export interface CreatePaymentDto {
  amount: number;
  currency: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentGatewayResponse {
  externalId: string;
  paymentUrl: string;
}

export enum WebhookPaymentStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface PaymentWebhookResult {
  externalId: string;
  status: WebhookPaymentStatus;
  rawPayload?: any;
}

export interface IPaymentGateway {
  createSession(
    keys: any,
    data: CreatePaymentDto
  ): Promise<PaymentGatewayResponse>;
  handleWebhook(
    keys: any,
    payload: any,
    signature?: string
  ): Promise<PaymentWebhookResult>;
}
