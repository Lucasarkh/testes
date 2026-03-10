import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { EncryptionService } from '@common/encryption/ecryption.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';

const REQUIRED_KEYS: Record<string, string[]> = {
  STRIPE: ['secretKey'],
  ASAAS: ['apiKey'],
  MERCADO_PAGO: ['accessToken'],
  PAGAR_ME: ['secretKey'],
  PAGSEGURO: ['token']
};

function validateKeysJson(provider: string, keysJson: any): void {
  const required = REQUIRED_KEYS[provider] || [];
  const missing = required.filter((k) => !keysJson?.[k]?.toString().trim());
  if (missing.length > 0) {
    throw new BadRequestException(
      `Campos obrigatórios faltando para ${provider}: ${missing.join(', ')}`
    );
  }
}

@ApiTags('Admin - Payment')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/payment-config')
export class PaymentConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all payment gateways for the tenant' })
  async listConfigs(@Req() req: any) {
    const configs = await this.prisma.paymentConfig.findMany({
      where: { tenantId: req.user.tenantId }
    });

    // Never expose the raw keys to the client — return masked placeholders.
    return configs.map((cfg) => ({
      ...cfg,
      keysJson: cfg.keysJson ? { _masked: true } : null
    }));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new payment gateway' })
  async createConfig(
    @Body()
    body: {
      name: string;
      provider: PaymentProvider;
      isActive: boolean;
      keysJson: any;
      webhookSecret?: string;
    },
    @Req() req: any
  ) {
    if (!body.name?.trim()) {
      throw new BadRequestException('Nome do perfil é obrigatório.');
    }
    validateKeysJson(body.provider, body.keysJson);

    // Prevent duplicate provider for same tenant
    const duplicate = await this.prisma.paymentConfig.findFirst({
      where: {
        tenantId: req.user.tenantId,
        provider: body.provider
      }
    });

    if (duplicate) {
      throw new BadRequestException(
        `Já existe um gateway configurado para o provedor ${body.provider}. Remova o antigo primeiro.`
      );
    }

    return this.prisma.paymentConfig.create({
      data: {
        tenantId: req.user.tenantId,
        name: body.name,
        provider: body.provider,
        isActive: body.isActive,
        keysJson: this.encryption.encryptJson(body.keysJson) as any,
        webhookSecret: body.webhookSecret
      }
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment gateway' })
  async updateConfig(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      provider?: PaymentProvider;
      isActive?: boolean;
      keysJson?: any;
      webhookSecret?: string;
    },
    @Req() req: any
  ) {
    const existing = await this.prisma.paymentConfig.findUnique({
      where: { id }
    });
    if (!existing || existing.tenantId !== req.user.tenantId) {
      throw new NotFoundException('Gateway not found');
    }

    const effectiveProvider = body.provider || existing.provider;
    if (body.keysJson || body.provider) {
      const storedKeys = this.encryption.decryptJson(existing.keysJson) || {};
      const effectiveKeys = body.keysJson
        ? { ...storedKeys, ...body.keysJson }
        : storedKeys;
      validateKeysJson(effectiveProvider, effectiveKeys);

      // Update flags in body.keysJson so it persists correctly
      if (body.keysJson) {
        body.keysJson = effectiveKeys;
      }
    }
    if (body.name !== undefined && !body.name?.trim()) {
      throw new BadRequestException('Nome do perfil é obrigatório.');
    }

    return this.prisma.paymentConfig.update({
      where: { id },
      data: {
        name: body.name,
        provider: body.provider,
        isActive: body.isActive,
        ...(body.keysJson !== undefined && {
          keysJson: this.encryption.encryptJson(body.keysJson) as any
        }),
        webhookSecret: body.webhookSecret
      }
    });
  }

  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get gateways and check which are active for project'
  })
  async getProjectGateways(
    @Param('projectId') projectId: string,
    @Req() req: any
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        paymentGateways: { select: { id: true } }
      }
    });

    if (
      !project ||
      (req.user.role !== 'SYSADMIN' && project.tenantId !== req.user.tenantId)
    ) {
      throw new NotFoundException('Project not found');
    }

    const allGateways = await this.prisma.paymentConfig.findMany({
      where: { tenantId: req.user.tenantId }
    });

    const activeIds = project.paymentGateways.map((g) => g.id);

    return allGateways.map((g) => ({
      ...g,
      keysJson: g.keysJson ? { _masked: true } : null,
      isEnabledForProject: activeIds.includes(g.id)
    }));
  }

  @Post('project/:projectId/toggle')
  @ApiOperation({ summary: 'Toggle a gateway for a project' })
  async toggleProjectGateway(
    @Param('projectId') projectId: string,
    @Body() body: { gatewayId: string; enabled: boolean },
    @Req() req: any
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId }
    });
    if (
      !project ||
      (req.user.role !== 'SYSADMIN' && project.tenantId !== req.user.tenantId)
    ) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        paymentGateways: body.enabled
          ? { connect: { id: body.gatewayId } }
          : { disconnect: { id: body.gatewayId } }
      }
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a payment gateway' })
  async deleteConfig(@Param('id') id: string, @Req() req: any) {
    const existing = await this.prisma.paymentConfig.findUnique({
      where: { id }
    });
    if (!existing || existing.tenantId !== req.user.tenantId) {
      throw new NotFoundException('Gateway not found');
    }

    return this.prisma.paymentConfig.delete({ where: { id } });
  }
}
