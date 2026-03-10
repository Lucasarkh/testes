import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Pricing Table DTOs ──────────────────────────────────

export class PricingTierDto {
  @ApiProperty({ description: 'Nº do projeto (1 = primeiro, 2 = segundo...)' })
  @IsInt()
  @Min(1)
  projectNumber: number;

  @ApiProperty({ description: 'Preço mensal em centavos para este slot' })
  @IsInt()
  @Min(0)
  priceCents: number;
}

export class UpsertPricingTableDto {
  @ApiPropertyOptional({
    description: 'ID (para update). Omitir para criar nova.'
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Nome da tabela de preços' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Marcar como tabela padrão' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ type: [PricingTierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  tiers: PricingTierDto[];
}

// ─── Tenant Pricing Assignment ───────────────────────────

export class AssignPricingTableDto {
  @ApiProperty({ description: 'ID da tabela de preços' })
  @IsString()
  pricingTableId: string;

  @ApiPropertyOptional({
    description: 'Desconto em % para este tenant (0-100)',
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Número de projetos gratuitos',
    default: 1
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeProjects?: number;
}

// ─── Billing Anchor ──────────────────────────────────────

export class SetBillingAnchorDto {
  @ApiProperty({
    description: 'Dia do mês para vencimento (1-28)',
    example: 10
  })
  @IsInt()
  @Min(1)
  @Max(28)
  billingDay: number;
}

export class SetTenantTrialDto {
  @ApiProperty({
    description: 'Duração do período de teste em meses (1-24)',
    example: 3
  })
  @IsInt()
  @Min(1)
  @Max(24)
  trialMonths: number;
}

// ─── Customer Setup ──────────────────────────────────────

export class CreateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class SavePaymentMethodDto {
  @ApiProperty({ description: 'Stripe PaymentMethod ID (pm_xxx)' })
  @IsString()
  paymentMethodId: string;
}

// ─── Checkout ────────────────────────────────────────────

export class CreateCheckoutDto {
  @ApiPropertyOptional({ description: 'Success redirect URL' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel redirect URL' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

// ─── Response DTOs ───────────────────────────────────────

export class ProjectBillingItemDto {
  projectId: string;
  projectName: string;
  projectSlug: string;
  tierNumber: number;
  basePriceCents: number;
  discountPercent: number;
  effectivePriceCents: number;
  isFree: boolean;
}

export class SubscriptionStatusDto {
  tenantId: string;
  tenantName: string;
  billingStatus: string;
  stripeCustomerId: string | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  projects: ProjectBillingItemDto[];
  totalMonthlyCents: number;
  gracePeriodEnd: Date | null;
  pricingTable: {
    id: string;
    name: string;
    description?: string;
    tiers: { projectNumber: number; priceCents: number }[];
  } | null;
  volumeDiscountPercent: number;
  currentUnitPriceCents: number;
  freeProjects: number;
  activeProjectCount: number;
  maxProjects: number;
  canCreateProject: boolean;
  nextProjectPriceCents: number | null;
  trialStartedAt: Date | null;
  trialMonths: number;
  trialInterruptedAt: Date | null;
  trialEndDate: Date | null;
  trialActive: boolean;
  trialExpired: boolean;
  isOnFreeTier: boolean;
  requiresSubscription: boolean;
  billingInteractionAllowed: boolean;
}

export class ProjectLimitsDto {
  activeProjectCount: number;
  maxProjects: number;
  freeProjects: number;
  canCreateProject: boolean;
  nextProjectPriceCents: number | null;
  discountPercent: number;
  requiresSubscription: boolean;
}
