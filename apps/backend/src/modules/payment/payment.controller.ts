import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Header,
  Req,
  HttpCode,
  Logger
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentProvider } from '@prisma/client';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('reserve')
  @ApiOperation({ summary: 'Start a reservation payment' })
  @ApiResponse({ status: 201, description: 'Checkout URL generated' })
  async createReservation(
    @Body('leadId') leadId: string,
    @Body('amount') amount: number,
    @Body('baseUrl') baseUrl?: string,
    @Body('returnPath') returnPath?: string
  ) {
    return this.paymentService.startReservationPayment(leadId, amount, {
      baseUrl,
      returnPath
    });
  }

  @Get(':paymentId/status')
  @ApiOperation({ summary: 'Check or sync reservation payment status' })
  @ApiResponse({ status: 200, description: 'Payment status resolved' })
  async getReservationStatus(@Param('paymentId') paymentId: string) {
    return this.paymentService.getReservationStatus(paymentId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Mark lead as abandoned when they cancel/desist' })
  @ApiResponse({ status: 200, description: 'Lead marked as abandoned' })
  async cancelReservation(@Body('leadId') leadId: string) {
    return this.paymentService.markAsAbandoned(leadId);
  }
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('stripe/:projectId')
  @HttpCode(200)
  async handleStripeWebhook(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    return this.paymentService.processWebhook(
      projectId,
      rawBody && signature ? rawBody : req.body,
      PaymentProvider.STRIPE,
      signature
    );
  }

  @Post('mercadopago/:projectId')
  @HttpCode(200)
  async handleMercadoPagoWebhook(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    // Mercado Pago often sends data in the body, but it could be query params too
    return this.paymentService.processWebhook(
      projectId,
      req.body,
      PaymentProvider.MERCADO_PAGO
    );
  }

  @Post('asaas/:projectId')
  @HttpCode(200)
  async handleAsaasWebhook(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    return this.paymentService.processWebhook(
      projectId,
      req.body,
      PaymentProvider.ASAAS
    );
  }

  @Post('pagarme/:projectId')
  @HttpCode(200)
  async handlePagarMeWebhook(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    return this.paymentService.processWebhook(
      projectId,
      req.body,
      PaymentProvider.PAGAR_ME
    );
  }

  @Post('pagseguro/:projectId')
  @HttpCode(200)
  async handlePagSeguroWebhook(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    return this.paymentService.processWebhook(
      projectId,
      req.body,
      PaymentProvider.PAGSEGURO
    );
  }
}
