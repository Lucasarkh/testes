import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BillingService } from './billing.service';
import {
  UpsertPricingTableDto,
  AssignPricingTableDto,
  SetTenantTrialDto,
  SetBillingAnchorDto,
  CreateCustomerDto,
  SavePaymentMethodDto,
  CreateCheckoutDto
} from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { TenantId } from '@/common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

// ─── SYSADMIN BILLING CONTROLLER ──────────────────────────

@ApiTags('Billing - Admin')
@ApiBearerAuth()
@Controller('billing/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSADMIN)
export class BillingAdminController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Pricing Tables ─────────────────────────────────────

  @Post('pricing-tables')
  @ApiOperation({ summary: 'Create/update a pricing table with tiers' })
  upsertPricingTable(@Body() dto: UpsertPricingTableDto) {
    return this.billingService.upsertPricingTable(dto);
  }

  @Get('pricing-tables')
  @ApiOperation({ summary: 'List all active pricing tables' })
  listPricingTables() {
    return this.billingService.listPricingTables();
  }

  @Delete('pricing-tables/:tableId')
  @ApiOperation({ summary: 'Deactivate a pricing table' })
  deletePricingTable(@Param('tableId') tableId: string) {
    return this.billingService.deletePricingTable(tableId);
  }

  // ─── Tenant Pricing Assignment ──────────────────────────

  @Put('tenants/:tenantId/pricing-table')
  @ApiOperation({ summary: 'Assign a pricing table to a tenant' })
  assignPricingTable(
    @Param('tenantId') tenantId: string,
    @Body() dto: AssignPricingTableDto
  ) {
    return this.billingService.assignPricingTable(tenantId, dto);
  }

  @Get('tenants/:tenantId/subscription')
  @ApiOperation({ summary: 'Get subscription status for a tenant' })
  getSubscription(@Param('tenantId') tenantId: string) {
    return this.billingService.getSubscriptionStatus(tenantId);
  }

  @Put('tenants/:tenantId/billing-anchor')
  @ApiOperation({ summary: 'Set custom billing date for a tenant' })
  setBillingAnchor(
    @Param('tenantId') tenantId: string,
    @Body() dto: SetBillingAnchorDto
  ) {
    return this.billingService.setBillingAnchor(tenantId, dto.billingDay);
  }

  @Post('tenants/:tenantId/customer')
  @ApiOperation({ summary: 'Create/ensure Stripe customer for tenant' })
  ensureCustomer(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateCustomerDto
  ) {
    return this.billingService.ensureStripeCustomer(tenantId, dto);
  }

  @Get('tenants/:tenantId/invoices')
  @ApiOperation({ summary: 'List invoices for a tenant' })
  listInvoices(@Param('tenantId') tenantId: string) {
    return this.billingService.listInvoices(tenantId);
  }

  @Get('tenants/:tenantId/project-limits')
  @ApiOperation({ summary: 'Get project limits for a tenant' })
  getProjectLimits(@Param('tenantId') tenantId: string) {
    return this.billingService.getProjectLimits(tenantId);
  }

  @Post('tenants/:tenantId/fix-payment-methods')
  @ApiOperation({ summary: 'Fix subscription payment methods (enable boleto)' })
  fixPaymentMethods(@Param('tenantId') tenantId: string) {
    return this.billingService.fixSubscriptionPaymentMethods(tenantId);
  }

  @Post('tenants/:tenantId/sync-subscription')
  @ApiOperation({ summary: 'Force re-sync subscription for a tenant' })
  syncSubscription(@Param('tenantId') tenantId: string) {
    return this.billingService.syncTenantSubscription(tenantId);
  }

  @Put('tenants/:tenantId/trial')
  @ApiOperation({
    summary: 'Define/reativa período de teste (meses) para uma tenant'
  })
  setTenantTrial(
    @Param('tenantId') tenantId: string,
    @Body() dto: SetTenantTrialDto
  ) {
    return this.billingService.setTenantTrialPeriod(tenantId, dto.trialMonths);
  }

  @Post('tenants/:tenantId/trial/interrupt')
  @ApiOperation({
    summary: 'Interrompe imediatamente o período de teste da tenant'
  })
  interruptTenantTrial(@Param('tenantId') tenantId: string) {
    return this.billingService.interruptTenantTrial(tenantId);
  }
}

// ─── TENANT BILLING CONTROLLER (self-service) ─────────────

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available plan levels for my tenant' })
  getMyPlans(@TenantId() tenantId: string) {
    return this.billingService.getAvailablePlans(tenantId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get my subscription status' })
  getMyStatus(@TenantId() tenantId: string) {
    return this.billingService.getSubscriptionStatus(tenantId);
  }

  @Get('project-limits')
  @ApiOperation({ summary: 'Get project limits for my tenant' })
  getMyProjectLimits(@TenantId() tenantId: string) {
    return this.billingService.getProjectLimits(tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List my invoices' })
  getMyInvoices(@TenantId() tenantId: string) {
    return this.billingService.listInvoices(tenantId);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'List saved payment methods' })
  listMethods(@TenantId() tenantId: string) {
    return this.billingService.listPaymentMethods(tenantId);
  }

  @Post('payment-methods')
  @ApiOperation({ summary: 'Save a new payment method' })
  saveMethod(@TenantId() tenantId: string, @Body() dto: SavePaymentMethodDto) {
    return this.billingService.savePaymentMethod(tenantId, dto);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create checkout session to add payment method' })
  createCheckout(@TenantId() tenantId: string, @Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckoutSession(
      tenantId,
      dto.successUrl,
      dto.cancelUrl
    );
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Create subscription checkout (charges the user)' })
  createSubscriptionCheckout(
    @TenantId() tenantId: string,
    @Body()
    body: { projectCount: number; successUrl?: string; cancelUrl?: string }
  ) {
    return this.billingService.createSubscriptionCheckout(
      tenantId,
      body.projectCount,
      body.successUrl,
      body.cancelUrl
    );
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create billing portal session' })
  createPortal(@TenantId() tenantId: string) {
    return this.billingService.createPortalSession(tenantId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync tenant subscription (after checkout, etc.)' })
  syncSubscription(@TenantId() tenantId: string) {
    return this.billingService.syncTenantSubscription(tenantId);
  }
}

// ─── STRIPE WEBHOOK CONTROLLER ────────────────────────────

@ApiTags('Billing - Webhooks')
@Controller('billing/webhooks')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string
  ) {
    const rawBody = req.rawBody as Buffer;
    if (!rawBody) {
      throw new Error(
        'Raw body not available. Ensure raw body parsing is enabled.'
      );
    }
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
