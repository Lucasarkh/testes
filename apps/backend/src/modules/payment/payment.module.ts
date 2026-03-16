import { Module, Global } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController, WebhooksController } from './payment.controller';
import { PaymentConfigController } from './payment-config.controller';
import { StripeAdapter } from './adapters/stripe.adapter';
import { MercadoPagoAdapter } from './adapters/mercado-pago.adapter';
import { AsaasAdapter } from './adapters/asaas.adapter';
import { PagarMeAdapter } from './adapters/pagar-me.adapter';
import { PagSeguroAdapter } from './adapters/pagseguro.adapter';
import { DbModule } from '@infra/db/db.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { PurchaseFlowModule } from '@modules/purchase-flow/purchase-flow.module';

@Global() // Global so other modules can easily trigger payments
@Module({
  imports: [DbModule, NotificationsModule, PurchaseFlowModule],
  controllers: [PaymentController, WebhooksController, PaymentConfigController],
  providers: [
    PaymentService,
    StripeAdapter,
    MercadoPagoAdapter,
    AsaasAdapter,
    PagarMeAdapter,
    PagSeguroAdapter
  ],
  exports: [PaymentService]
})
export class PaymentModule {}
