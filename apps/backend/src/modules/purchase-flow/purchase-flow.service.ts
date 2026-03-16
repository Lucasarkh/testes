import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@infra/db/prisma.service';
import { S3Service } from '@infra/s3/s3.service';
import { EmailQueueService } from '@infra/email-queue/email-queue.service';
import {
  ContractEnvelopeStatus,
  DigitalSignatureProvider,
  LeadStatus,
  PurchaseDocumentType,
  PurchaseFunnelEventType,
  PurchasePartyRole,
  PurchaseStep
} from '@prisma/client';
import { createHash, randomInt, randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import {
  ConfirmSaleDto,
  CustomerConditionsConfirmationDto,
  CustomerDocumentRegistrationDto,
  CustomerDocumentUploadRequestDto,
  CustomerOtpRequestDto,
  CustomerOtpVerifyDto,
  CustomerProfileDto,
  CustomerSimulationDto,
  GenerateContractDto,
  ManualContractSignatureDto,
  PurchaseMetricsQueryDto,
  UpdatePurchaseFlowConfigDto
} from './dto/purchase-flow.dto';

const ACCESS_COOKIE_NAME = 'lotio_purchase_access';
const OTP_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 7;

const DEFAULT_REQUIRED_FIELDS = [
  { field: 'name', label: 'Nome completo', required: true },
  { field: 'cpf', label: 'CPF', required: true },
  { field: 'maritalStatus', label: 'Estado civil', required: true },
  { field: 'occupation', label: 'Profissão', required: true },
  { field: 'monthlyIncome', label: 'Renda', required: true },
  { field: 'address', label: 'Endereço', required: true }
];

const DEFAULT_REQUIRED_DOCUMENTS = [
  { documentType: PurchaseDocumentType.RG, required: true },
  { documentType: PurchaseDocumentType.CPF, required: true },
  {
    documentType: PurchaseDocumentType.COMPROVANTE_RESIDENCIA,
    required: true
  }
];

const STEP_ROUTE_MAP: Record<PurchaseStep, string> = {
  RESERVA_CRIADA: 'pagamento-reserva-confirmado',
  PAGAMENTO_RESERVA_CONFIRMADO: 'pagamento-reserva-confirmado',
  CADASTRO_CLIENTE: 'cadastro-cliente',
  CADASTRO_CONJUGE: 'cadastro-conjuge',
  UPLOAD_DOCUMENTOS: 'upload-documentos',
  SIMULACAO_PAGAMENTO: 'simulacao-pagamento',
  CONFIRMACAO_CONDICOES: 'confirmacao-condicoes',
  GERAR_CONTRATO: 'gerar-contrato',
  ASSINAR_CONTRATO: 'assinar-contrato',
  VENDA_CONFIRMADA: 'venda-confirmada'
};

const STEP_ORDER: PurchaseStep[] = [
  PurchaseStep.RESERVA_CRIADA,
  PurchaseStep.PAGAMENTO_RESERVA_CONFIRMADO,
  PurchaseStep.CADASTRO_CLIENTE,
  PurchaseStep.CADASTRO_CONJUGE,
  PurchaseStep.UPLOAD_DOCUMENTOS,
  PurchaseStep.SIMULACAO_PAGAMENTO,
  PurchaseStep.CONFIRMACAO_CONDICOES,
  PurchaseStep.GERAR_CONTRATO,
  PurchaseStep.ASSINAR_CONTRATO,
  PurchaseStep.VENDA_CONFIRMADA
];

@Injectable()
export class PurchaseFlowService {
  private readonly logger = new Logger(PurchaseFlowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly emailQueue: EmailQueueService
  ) {}

  getAccessCookieName() {
    return ACCESS_COOKIE_NAME;
  }

  getAccessCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
      path: '/'
    };
  }

  async getConfig(tenantId: string, projectId: string) {
    const config = await this.ensureDefaultConfig(tenantId, projectId);
    return this.serializeConfig(config);
  }

  async updateConfig(
    tenantId: string,
    projectId: string,
    dto: UpdatePurchaseFlowConfigDto
  ) {
    await this.ensureProjectExists(tenantId, projectId);

    await this.prisma.$transaction(async (tx) => {
      const config = await tx.purchaseFlowConfig.upsert({
        where: { projectId },
        create: {
          tenantId,
          projectId,
          requireSpouseWhenMaritalStatus:
            dto.requireSpouseWhenMaritalStatus || ['CASADO', 'UNIAO_ESTAVEL'],
          signatureProvider: dto.signatureProvider || DigitalSignatureProvider.MANUAL,
          signatureProviderConfig: dto.signatureProviderConfig,
          autoGenerateContract: dto.autoGenerateContract ?? true
        },
        update: {
          ...(dto.requireSpouseWhenMaritalStatus !== undefined && {
            requireSpouseWhenMaritalStatus:
              dto.requireSpouseWhenMaritalStatus
          }),
          ...(dto.signatureProvider !== undefined && {
            signatureProvider: dto.signatureProvider
          }),
          ...(dto.signatureProviderConfig !== undefined && {
            signatureProviderConfig: dto.signatureProviderConfig
          }),
          ...(dto.autoGenerateContract !== undefined && {
            autoGenerateContract: dto.autoGenerateContract
          })
        }
      });

      if (dto.requiredFields) {
        await tx.purchaseFieldRequirement.deleteMany({
          where: { configId: config.id }
        });
        if (dto.requiredFields.length) {
          await tx.purchaseFieldRequirement.createMany({
            data: dto.requiredFields.map((item, index) => ({
              configId: config.id,
              field: item.field,
              label: item.label || null,
              required: item.required,
              sortOrder: index
            }))
          });
        }
      }

      if (dto.requiredDocuments) {
        await tx.purchaseDocumentRequirement.deleteMany({
          where: { configId: config.id }
        });
        if (dto.requiredDocuments.length) {
          await tx.purchaseDocumentRequirement.createMany({
            data: dto.requiredDocuments.map((item, index) => ({
              configId: config.id,
              documentType: item.documentType,
              required: item.required,
              sortOrder: index
            }))
          });
        }
      }

      if (dto.paymentTables) {
        await tx.purchasePaymentCondition.deleteMany({
          where: { table: { projectId } }
        });
        await tx.purchasePaymentTable.deleteMany({ where: { projectId } });

        for (const table of dto.paymentTables) {
          await tx.purchasePaymentTable.create({
            data: {
              tenantId,
              projectId,
              name: table.name,
              entryMinPercent: table.entryMinPercent,
              maxInstallments: table.maxInstallments,
              correctionIndex: table.correctionIndex,
              conditions: {
                create: table.conditions.map((condition) => ({
                  numberInstallments: condition.numberInstallments,
                  entryAmount: condition.entryAmount,
                  installmentAmount: condition.installmentAmount,
                  totalAmount: condition.totalAmount ?? null
                }))
              }
            }
          });
        }
      }

      if (dto.contractTemplates) {
        await tx.contractTemplate.deleteMany({ where: { projectId } });

        const templates = dto.contractTemplates.map((template, index) => ({
          tenantId,
          projectId,
          title: template.title,
          contentTemplate: template.contentTemplate,
          isActive:
            template.isActive ??
            (index === 0 && !dto.contractTemplates?.some((item) => item.isActive))
        }));

        if (templates.length) {
          await tx.contractTemplate.createMany({ data: templates });
        }
      }
    });

    return this.getConfig(tenantId, projectId);
  }

  async getProcessForAdmin(tenantId: string, leadId: string) {
    const process = await this.loadProcessByLeadId(leadId, tenantId);
    return this.buildFlowResponse(process);
  }

  async getMetrics(tenantId: string, query: PurchaseMetricsQueryDto) {
    const where = {
      tenantId,
      ...(query.projectId ? { projectId: query.projectId } : {})
    };

    const [totalReservations, totalSales, signedContracts, generatedContracts, completedDurations, abandoned] =
      await Promise.all([
        this.prisma.purchaseProcess.count({ where }),
        this.prisma.purchaseProcess.count({
          where: { ...where, vendaConfirmada: true }
        }),
        this.prisma.purchaseProcess.count({
          where: { ...where, contratoAssinado: true }
        }),
        this.prisma.purchaseProcess.count({
          where: { ...where, contratoGerado: true }
        }),
        this.prisma.purchaseProcess.findMany({
          where: {
            ...where,
            vendaConfirmada: true,
            completedAt: { not: null }
          },
          select: { startedAt: true, completedAt: true }
        }),
        this.prisma.purchaseProcess.groupBy({
          by: ['currentStep'],
          where: {
            ...where,
            OR: [
              { cancelledAt: { not: null } },
              {
                lead: {
                  status: { in: [LeadStatus.ABANDONED, LeadStatus.CANCELLED, LeadStatus.LOST] }
                }
              }
            ]
          },
          _count: { _all: true }
        })
      ]);

    const averageClosingHours = completedDurations.length
      ? completedDurations.reduce((sum, item) => {
          if (!item.completedAt) return sum;
          return sum + (item.completedAt.getTime() - item.startedAt.getTime()) / 3600000;
        }, 0) / completedDurations.length
      : 0;

    return {
      summary: {
        totalReservations,
        totalSales,
        conversionRate: totalReservations
          ? Number(((totalSales / totalReservations) * 100).toFixed(1))
          : 0,
        averageClosingHours: Number(averageClosingHours.toFixed(1)),
        contractSignedRate: generatedContracts
          ? Number(((signedContracts / generatedContracts) * 100).toFixed(1))
          : 0
      },
      abandonmentByStep: abandoned.map((item) => ({
        step: item.currentStep,
        count: item._count._all
      }))
    };
  }

  async ensureProcessForLead(leadId: string) {
    const existing = await this.prisma.purchaseProcess.findUnique({
      where: { leadId }
    });
    if (existing) return existing;

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { project: true }
    });
    if (!lead) throw new NotFoundException('Lead não encontrado.');

    const process = await this.prisma.purchaseProcess.create({
      data: {
        tenantId: lead.tenantId,
        projectId: lead.projectId,
        leadId: lead.id,
        currentStep: PurchaseStep.RESERVA_CRIADA,
        stepTimelines: {
          create: {
            step: PurchaseStep.RESERVA_CRIADA,
            startedAt: new Date()
          }
        }
      }
    });

    await this.recordEvent(process.id, {
      tenantId: lead.tenantId,
      projectId: lead.projectId,
      leadId: lead.id,
      eventType: PurchaseFunnelEventType.RESERVA_CRIADA,
      step: PurchaseStep.RESERVA_CRIADA,
      payload: { source: lead.source || 'website' }
    });

    return process;
  }

  async activateReservationPaymentConfirmed(leadId: string) {
    const process = await this.ensureProcessForLead(leadId);
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { project: true }
    });
    if (!lead) throw new NotFoundException('Lead não encontrado.');

    const now = new Date();
    const reservationExpiresAt =
      lead.project.reservationExpiryHours > 0
        ? new Date(now.getTime() + lead.project.reservationExpiryHours * 3600000)
        : null;

    await this.finishStepTimeline(process.id, PurchaseStep.RESERVA_CRIADA);
    await this.ensureStepTimeline(process.id, PurchaseStep.PAGAMENTO_RESERVA_CONFIRMADO, now, now);
    await this.transitionProcess(process.id, PurchaseStep.CADASTRO_CLIENTE, {
      reservationExpiresAt,
      cancelledAt: null
    });

    await this.recordEvent(process.id, {
      tenantId: lead.tenantId,
      projectId: lead.projectId,
      leadId: lead.id,
      eventType: PurchaseFunnelEventType.PAGAMENTO_RESERVA,
      step: PurchaseStep.PAGAMENTO_RESERVA_CONFIRMADO
    });
  }

  async activateManualReservation(leadId: string) {
    const process = await this.ensureProcessForLead(leadId);
    await this.finishStepTimeline(process.id, PurchaseStep.RESERVA_CRIADA);
    await this.ensureStepTimeline(
      process.id,
      PurchaseStep.PAGAMENTO_RESERVA_CONFIRMADO,
      new Date(),
      new Date()
    );
    await this.transitionProcess(process.id, PurchaseStep.CADASTRO_CLIENTE);
  }

  async requestOtp(dto: CustomerOtpRequestDto) {
    const process = await this.findActiveProcessByContact(dto.email, dto.phone);
    if (!process) {
      throw new NotFoundException('Nenhuma reserva ativa encontrada para os dados informados.');
    }

    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.purchaseAccessCode.create({
      data: {
        processId: process.id,
        email: dto.email.toLowerCase(),
        phone: dto.phone || null,
        codeHash: this.hashValue(code),
        expiresAt
      }
    });

    const recipientName =
      process.clients.find((item) => item.role === PurchasePartyRole.PRIMARY)?.name ||
      process.lead.name ||
      'Cliente';

    await this.emailQueue.queueSystemNotificationEmail(
      dto.email.toLowerCase(),
      recipientName,
      'Codigo para continuar sua compra',
      `Seu codigo para retomar o fluxo de compra e ${code}. Ele expira em ${OTP_TTL_MINUTES} minutos.`
    );

    return { ok: true, expiresAt };
  }

  async verifyOtp(dto: CustomerOtpVerifyDto) {
    const process = await this.findActiveProcessByContact(dto.email, dto.phone);
    if (!process) {
      throw new NotFoundException('Nenhuma reserva ativa encontrada para os dados informados.');
    }

    const codeRecord = await this.prisma.purchaseAccessCode.findFirst({
      where: {
        processId: process.id,
        email: dto.email.toLowerCase(),
        phone: dto.phone || null,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!codeRecord || codeRecord.codeHash !== this.hashValue(dto.code)) {
      throw new UnauthorizedException('Codigo invalido ou expirado.');
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.purchaseAccessCode.update({
        where: { id: codeRecord.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.purchaseAccessSession.create({
        data: {
          processId: process.id,
          email: dto.email.toLowerCase(),
          phone: dto.phone || null,
          tokenHash: this.hashValue(token),
          expiresAt
        }
      })
    ]);

    return {
      token,
      expiresAt,
      reservation: this.buildReservationSummary(process)
    };
  }

  async getActiveReservationByAccessToken(token?: string) {
    const process = await this.getProcessFromAccessToken(token);
    return this.buildReservationSummary(process);
  }

  async getCustomerFlow(token?: string) {
    const process = await this.getProcessFromAccessToken(token);
    return this.buildFlowResponse(process);
  }

  async updatePrimaryCustomer(token: string | undefined, dto: CustomerProfileDto) {
    const process = await this.getProcessFromAccessToken(token);
    const config = await this.ensureDefaultConfig(process.tenantId, process.projectId);

    this.validateRequiredFields(dto, config.fieldRequirements);

    const maritalStatus = String(dto.maritalStatus || '').trim().toUpperCase();
    const requiresSpouse = config.requireSpouseWhenMaritalStatus.includes(maritalStatus);

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseClientProfile.upsert({
        where: {
          processId_role: {
            processId: process.id,
            role: PurchasePartyRole.PRIMARY
          }
        },
        create: {
          processId: process.id,
          role: PurchasePartyRole.PRIMARY,
          ...this.mapProfilePayload(dto)
        },
        update: this.mapProfilePayload(dto)
      });

      await tx.lead.update({
        where: { id: process.leadId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.email !== undefined && { email: dto.email?.toLowerCase() || null }),
          ...(dto.phone !== undefined && { phone: dto.phone || null }),
          ...(dto.cpf !== undefined && { cpf: dto.cpf || null }),
          ...(dto.rg !== undefined && { rg: dto.rg || null }),
          ...(dto.maritalStatus !== undefined && { maritalStatus: dto.maritalStatus || null }),
          ...(dto.occupation !== undefined && { occupation: dto.occupation || null }),
          ...(dto.address !== undefined && { address: dto.address || null }),
          ...(dto.addressCity !== undefined && { addressCity: dto.addressCity || null }),
          ...(dto.addressState !== undefined && { addressState: dto.addressState || null }),
          ...(dto.addressZip !== undefined && { addressZip: dto.addressZip || null })
        }
      });

      await tx.purchaseProcess.update({
        where: { id: process.id },
        data: {
          cadastroClienteCompleto: true,
          requiresSpouse
        }
      });
    });

    await this.recordEvent(process.id, {
      tenantId: process.tenantId,
      projectId: process.projectId,
      leadId: process.leadId,
      eventType: PurchaseFunnelEventType.CADASTRO_CONCLUIDO,
      step: PurchaseStep.CADASTRO_CLIENTE
    });

    await this.transitionProcess(
      process.id,
      requiresSpouse ? PurchaseStep.CADASTRO_CONJUGE : PurchaseStep.UPLOAD_DOCUMENTOS
    );

    return this.getCustomerFlow(token);
  }

  async updateSpouseCustomer(token: string | undefined, dto: CustomerProfileDto) {
    const process = await this.getProcessFromAccessToken(token);
    if (!process.requiresSpouse) {
      throw new BadRequestException('Este processo nao exige cadastro de conjuge.');
    }

    await this.prisma.purchaseClientProfile.upsert({
      where: {
        processId_role: {
          processId: process.id,
          role: PurchasePartyRole.SPOUSE
        }
      },
      create: {
        processId: process.id,
        role: PurchasePartyRole.SPOUSE,
        ...this.mapProfilePayload(dto)
      },
      update: this.mapProfilePayload(dto)
    });

    await this.prisma.purchaseProcess.update({
      where: { id: process.id },
      data: { cadastroConjugeCompleto: true }
    });

    await this.transitionProcess(process.id, PurchaseStep.UPLOAD_DOCUMENTOS);
    return this.getCustomerFlow(token);
  }

  async getCustomerDocumentUploadUrl(
    token: string | undefined,
    dto: CustomerDocumentUploadRequestDto
  ) {
    const process = await this.getProcessFromAccessToken(token);
    const role = dto.role || PurchasePartyRole.PRIMARY;
    const key = this.s3.buildKey(
      process.tenantId,
      `projects/${process.projectId}/purchase-documents/${process.id}/${role.toLowerCase()}`,
      dto.fileName
    );

    return this.s3.presignedUploadUrl(key, dto.contentType);
  }

  async registerCustomerDocument(
    token: string | undefined,
    dto: CustomerDocumentRegistrationDto
  ) {
    const process = await this.getProcessFromAccessToken(token);
    const role = dto.role || PurchasePartyRole.PRIMARY;

    await this.prisma.purchaseDocument.create({
      data: {
        processId: process.id,
        role,
        documentType: dto.documentType,
        fileName: dto.fileName || null,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType || null
      }
    });

    const ready = await this.areRequiredDocumentsSatisfied(process.id, process.projectId, process.tenantId);
    if (ready) {
      await this.prisma.purchaseProcess.update({
        where: { id: process.id },
        data: { documentosEnviados: true }
      });
      await this.recordEvent(process.id, {
        tenantId: process.tenantId,
        projectId: process.projectId,
        leadId: process.leadId,
        eventType: PurchaseFunnelEventType.DOCUMENTOS_ENVIADOS,
        step: PurchaseStep.UPLOAD_DOCUMENTOS
      });
      await this.transitionProcess(process.id, PurchaseStep.SIMULACAO_PAGAMENTO);
    }

    return this.getCustomerFlow(token);
  }

  async approveSimulation(token: string | undefined, dto: CustomerSimulationDto) {
    const process = await this.getProcessFromAccessToken(token);
    const paymentCondition = await this.prisma.purchasePaymentCondition.findFirst({
      where: {
        id: dto.paymentConditionId,
        tableId: dto.paymentTableId,
        table: { projectId: process.projectId }
      },
      include: { table: true }
    });

    if (!paymentCondition) {
      throw new NotFoundException('Condicao de pagamento nao encontrada.');
    }

    await this.prisma.purchaseProcess.update({
      where: { id: process.id },
      data: {
        selectedPaymentTableId: paymentCondition.tableId,
        selectedPaymentConditionId: paymentCondition.id,
        simulationSnapshot: {
          paymentTableName: paymentCondition.table.name,
          numberInstallments: paymentCondition.numberInstallments,
          entryAmount: Number(paymentCondition.entryAmount),
          installmentAmount: Number(paymentCondition.installmentAmount),
          totalAmount: paymentCondition.totalAmount
            ? Number(paymentCondition.totalAmount)
            : null,
          correctionIndex: paymentCondition.table.correctionIndex
        },
        simulacaoAprovada: true
      }
    });

    await this.recordEvent(process.id, {
      tenantId: process.tenantId,
      projectId: process.projectId,
      leadId: process.leadId,
      eventType: PurchaseFunnelEventType.SIMULACAO_APROVADA,
      step: PurchaseStep.SIMULACAO_PAGAMENTO
    });

    await this.transitionProcess(process.id, PurchaseStep.CONFIRMACAO_CONDICOES);
    return this.getCustomerFlow(token);
  }

  async confirmConditions(
    token: string | undefined,
    dto: CustomerConditionsConfirmationDto
  ) {
    if (!dto.accepted) {
      throw new BadRequestException('As condicoes precisam ser confirmadas para continuar.');
    }

    const process = await this.getProcessFromAccessToken(token);
    await this.prisma.purchaseProcess.update({
      where: { id: process.id },
      data: { condicoesConfirmadas: true }
    });

    await this.transitionProcess(process.id, PurchaseStep.GERAR_CONTRATO);
    return this.getCustomerFlow(token);
  }

  async generateContract(token: string | undefined, dto: GenerateContractDto) {
    const process = await this.loadProcessForMutation(token);
    const config = await this.ensureDefaultConfig(process.tenantId, process.projectId);

    const template = dto.templateId
      ? await this.prisma.contractTemplate.findFirst({
          where: {
            id: dto.templateId,
            projectId: process.projectId
          }
        })
      : await this.prisma.contractTemplate.findFirst({
          where: { projectId: process.projectId, isActive: true },
          orderBy: { createdAt: 'desc' }
        });

    if (!template) {
      throw new NotFoundException('Nenhum template de contrato ativo foi configurado.');
    }

    const renderedText = this.renderContractTemplate(process, template.contentTemplate);
    const renderedHtml = `<html><body style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.5;">${this.escapeHtml(renderedText)}</body></html>`;
    const pdfBuffer = await this.createContractPdf(template.title, renderedText);
    const pdfKey = this.s3.buildKey(
      process.tenantId,
      `projects/${process.projectId}/contracts/${process.id}`,
      `${template.title}.pdf`
    );
    const pdfUrl = await this.s3.upload(pdfBuffer, pdfKey, 'application/pdf');

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseGeneratedContract.create({
        data: {
          processId: process.id,
          templateId: template.id,
          status: ContractEnvelopeStatus.GENERATED,
          signatureProvider: config.signatureProvider,
          renderedText,
          renderedHtml,
          pdfUrl
        }
      });

      await tx.purchaseProcess.update({
        where: { id: process.id },
        data: {
          contratoGerado: true,
          selectedContractTemplateId: template.id
        }
      });
    });

    await this.recordEvent(process.id, {
      tenantId: process.tenantId,
      projectId: process.projectId,
      leadId: process.leadId,
      eventType: PurchaseFunnelEventType.CONTRATO_GERADO,
      step: PurchaseStep.GERAR_CONTRATO
    });

    await this.transitionProcess(process.id, PurchaseStep.ASSINAR_CONTRATO);
    return this.getCustomerFlow(token);
  }

  async signContract(
    token: string | undefined,
    dto: ManualContractSignatureDto
  ) {
    const process = await this.loadProcessForMutation(token);
    const contract = await this.prisma.purchaseGeneratedContract.findFirst({
      where: { processId: process.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!contract) {
      throw new NotFoundException('Contrato ainda nao foi gerado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseGeneratedContract.update({
        where: { id: contract.id },
        data: {
          status: ContractEnvelopeStatus.SIGNED,
          signatureRequestId: contract.signatureRequestId || randomUUID(),
          signedAt: new Date(),
          renderedHtml: contract.renderedHtml,
          renderedText: dto.signerName
            ? `${contract.renderedText || ''}\n\nAssinado por: ${dto.signerName}`
            : contract.renderedText
        }
      });

      await tx.purchaseProcess.update({
        where: { id: process.id },
        data: { contratoAssinado: true }
      });
    });

    await this.recordEvent(process.id, {
      tenantId: process.tenantId,
      projectId: process.projectId,
      leadId: process.leadId,
      eventType: PurchaseFunnelEventType.CONTRATO_ASSINADO,
      step: PurchaseStep.ASSINAR_CONTRATO
    });

    await this.transitionProcess(process.id, PurchaseStep.VENDA_CONFIRMADA);
    return this.getCustomerFlow(token);
  }

  async confirmSale(tenantId: string, leadId: string, dto?: ConfirmSaleDto) {
    const process = await this.loadProcessByLeadId(leadId, tenantId);

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseProcess.update({
        where: { id: process.id },
        data: {
          vendaConfirmada: true,
          completedAt: new Date(),
          currentStep: PurchaseStep.VENDA_CONFIRMADA
        }
      });

      await tx.lead.update({
        where: { id: process.leadId },
        data: {
          status: LeadStatus.WON,
          notes: dto?.notes ? `${process.lead.notes || ''}\n${dto.notes}`.trim() : process.lead.notes
        }
      });

      if (process.lead.mapElementId) {
        await tx.lotDetails.updateMany({
          where: { mapElementId: process.lead.mapElementId },
          data: { status: 'SOLD' }
        });
      }

      await tx.leadHistory.create({
        data: {
          leadId: process.leadId,
          fromStatus: process.lead.status,
          toStatus: LeadStatus.WON,
          notes: dto?.notes || 'Venda confirmada no fluxo pos-reserva',
          createdBy: 'SYSTEM_PURCHASE_FLOW'
        }
      });
    });

    await this.recordEvent(process.id, {
      tenantId: process.tenantId,
      projectId: process.projectId,
      leadId: process.leadId,
      eventType: PurchaseFunnelEventType.VENDA_CONFIRMADA,
      step: PurchaseStep.VENDA_CONFIRMADA
    });

    return this.getProcessForAdmin(tenantId, leadId);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireOpenProcesses() {
    const processes = await this.prisma.purchaseProcess.findMany({
      where: {
        cancelledAt: null,
        vendaConfirmada: false,
        reservationExpiresAt: { lt: new Date() },
        lead: { status: LeadStatus.RESERVATION }
      },
      include: {
        lead: true
      }
    });

    for (const process of processes) {
      await this.prisma.$transaction(async (tx) => {
        await tx.purchaseProcess.update({
          where: { id: process.id },
          data: { cancelledAt: new Date() }
        });

        await tx.lead.update({
          where: { id: process.leadId },
          data: {
            status: LeadStatus.ABANDONED,
            reservedAt: null
          }
        });

        await tx.leadHistory.create({
          data: {
            leadId: process.leadId,
            fromStatus: process.lead.status,
            toStatus: LeadStatus.ABANDONED,
            notes: 'Reserva expirada automaticamente no fluxo pos-reserva.',
            createdBy: 'SYSTEM_CRON'
          }
        });

        if (process.lead.mapElementId) {
          const othersCount = await tx.lead.count({
            where: {
              mapElementId: process.lead.mapElementId,
              status: { in: [LeadStatus.RESERVATION, LeadStatus.WON] },
              id: { not: process.leadId }
            }
          });

          if (othersCount === 0) {
            await tx.lotDetails.updateMany({
              where: { mapElementId: process.lead.mapElementId },
              data: { status: 'AVAILABLE' }
            });
          }
        }
      });
    }

    if (processes.length) {
      this.logger.log(`${processes.length} processo(s) pos-reserva expirados automaticamente.`);
    }
  }

  private async ensureProjectExists(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) {
      throw new NotFoundException('Projeto nao encontrado.');
    }
    return project;
  }

  private async ensureDefaultConfig(tenantId: string, projectId: string) {
    await this.ensureProjectExists(tenantId, projectId);
    const existing = await this.prisma.purchaseFlowConfig.findUnique({
      where: { projectId },
      include: {
        fieldRequirements: { orderBy: { sortOrder: 'asc' } },
        documentRequirements: { orderBy: { sortOrder: 'asc' } }
      }
    });

    if (existing) return existing;

    return this.prisma.purchaseFlowConfig.create({
      data: {
        tenantId,
        projectId,
        fieldRequirements: {
          create: DEFAULT_REQUIRED_FIELDS.map((item, index) => ({
            field: item.field,
            label: item.label,
            required: item.required,
            sortOrder: index
          }))
        },
        documentRequirements: {
          create: DEFAULT_REQUIRED_DOCUMENTS.map((item, index) => ({
            documentType: item.documentType,
            required: item.required,
            sortOrder: index
          }))
        }
      },
      include: {
        fieldRequirements: { orderBy: { sortOrder: 'asc' } },
        documentRequirements: { orderBy: { sortOrder: 'asc' } }
      }
    });
  }

  private async findActiveProcessByContact(email: string, phone?: string) {
    const normalizedEmail = email.toLowerCase();
    return this.prisma.purchaseProcess.findFirst({
      where: {
        cancelledAt: null,
        lead: {
          status: {
            in: [LeadStatus.RESERVATION, LeadStatus.WON]
          }
        },
        OR: [
          { lead: { email: { equals: normalizedEmail, mode: 'insensitive' as any } } },
          { clients: { some: { role: PurchasePartyRole.PRIMARY, email: { equals: normalizedEmail, mode: 'insensitive' as any } } } },
          ...(phone
            ? [
                { lead: { phone } },
                { clients: { some: { role: PurchasePartyRole.PRIMARY, phone } } }
              ]
            : [])
        ]
      },
      include: {
        lead: true,
        clients: true,
        project: true
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  private async getProcessFromAccessToken(token?: string) {
    if (!token) throw new UnauthorizedException('Sessao do cliente nao encontrada.');

    const session = await this.prisma.purchaseAccessSession.findFirst({
      where: {
        tokenHash: this.hashValue(token),
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      throw new UnauthorizedException('Sua sessao expirou. Solicite um novo codigo.');
    }

    await this.prisma.purchaseAccessSession.update({
      where: { id: session.id },
      data: { lastAccessAt: new Date() }
    });

    const process = await this.loadProcessById(session.processId);
    if (process.cancelledAt) {
      throw new BadRequestException('Esta reserva nao esta mais ativa.');
    }

    return process;
  }

  private async loadProcessForMutation(token?: string) {
    const process = await this.getProcessFromAccessToken(token);
    if (process.cancelledAt) {
      throw new BadRequestException('Este processo foi encerrado.');
    }
    return process;
  }

  private async loadProcessById(processId: string) {
    const process = await this.prisma.purchaseProcess.findUnique({
      where: { id: processId },
      include: this.flowInclude()
    });
    if (!process) {
      throw new NotFoundException('Processo de compra nao encontrado.');
    }
    return process;
  }

  private async loadProcessByLeadId(leadId: string, tenantId: string) {
    const process = await this.prisma.purchaseProcess.findFirst({
      where: { leadId, tenantId },
      include: this.flowInclude()
    });
    if (!process) {
      throw new NotFoundException('Processo de compra nao encontrado.');
    }
    return process;
  }

  private flowInclude() {
    return {
      project: true,
      lead: {
        include: {
          payments: true,
          mapElement: {
            include: { lotDetails: true }
          }
        }
      },
      clients: true,
      documents: { orderBy: { uploadedAt: 'desc' } },
      contracts: { orderBy: { createdAt: 'desc' } },
      selectedPaymentTable: {
        include: { conditions: { orderBy: { numberInstallments: 'asc' } } }
      },
      selectedPaymentCondition: true,
      selectedContractTemplate: true,
      stepTimelines: true
    } as const;
  }

  private buildReservationSummary(process: any) {
    const lot = process.lead.mapElement?.lotDetails;
    return {
      reservationId: process.leadId,
      lotId: process.lead.mapElementId,
      projectId: process.projectId,
      projectSlug: process.project.slug,
      etapaAtual: process.currentStep,
      routeStep: STEP_ROUTE_MAP[process.currentStep],
      lotCode: process.lead.mapElement?.code || lot?.lotNumber || null,
      reservationExpiresAt: process.reservationExpiresAt
    };
  }

  private async buildFlowResponse(process: any) {
    const config = await this.ensureDefaultConfig(process.tenantId, process.projectId);
    const paymentTables = await this.prisma.purchasePaymentTable.findMany({
      where: { projectId: process.projectId },
      include: { conditions: { orderBy: { numberInstallments: 'asc' } } },
      orderBy: { createdAt: 'asc' }
    });

    const primaryClient = process.clients.find((item: any) => item.role === PurchasePartyRole.PRIMARY) || null;
    const spouseClient = process.clients.find((item: any) => item.role === PurchasePartyRole.SPOUSE) || null;
    const latestContract = process.contracts?.[0] || null;
    const lot = process.lead.mapElement?.lotDetails;

    return {
      reservation: this.buildReservationSummary(process),
      project: {
        id: process.project.id,
        name: process.project.name,
        slug: process.project.slug
      },
      lot: {
        id: process.lead.mapElementId,
        code: process.lead.mapElement?.code || null,
        block: lot?.block || null,
        lotNumber: lot?.lotNumber || null,
        price: lot?.price ? Number(lot.price) : null
      },
      lead: {
        id: process.lead.id,
        name: process.lead.name,
        email: process.lead.email,
        phone: process.lead.phone,
        status: process.lead.status
      },
      currentStep: process.currentStep,
      currentRouteStep: STEP_ROUTE_MAP[process.currentStep],
      requiresSpouse: process.requiresSpouse,
      reservationExpiresAt: process.reservationExpiresAt,
      progress: this.buildProgress(process),
      config: {
        signatureProvider: config.signatureProvider,
        requiredFields: config.fieldRequirements,
        requiredDocuments: config.documentRequirements,
        requireSpouseWhenMaritalStatus: config.requireSpouseWhenMaritalStatus
      },
      customer: primaryClient,
      spouse: spouseClient,
      documents: process.documents,
      paymentTables: paymentTables.map((table) => ({
        ...table,
        entryMinPercent: Number(table.entryMinPercent),
        conditions: table.conditions.map((condition) => ({
          ...condition,
          entryAmount: Number(condition.entryAmount),
          installmentAmount: Number(condition.installmentAmount),
          totalAmount: condition.totalAmount ? Number(condition.totalAmount) : null
        }))
      })),
      selectedPaymentTableId: process.selectedPaymentTableId,
      selectedPaymentConditionId: process.selectedPaymentConditionId,
      simulationSnapshot: process.simulationSnapshot,
      latestContract,
      stepTimelines: process.stepTimelines
    };
  }

  private buildProgress(process: any) {
    return [
      {
        key: 'reserva',
        label: 'Reserva',
        completed: true,
        active: false
      },
      {
        key: 'cadastro',
        label: 'Cadastro',
        completed: process.cadastroClienteCompleto && (!process.requiresSpouse || process.cadastroConjugeCompleto),
        active: [PurchaseStep.CADASTRO_CLIENTE, PurchaseStep.CADASTRO_CONJUGE].includes(process.currentStep)
      },
      {
        key: 'documentos',
        label: 'Documentos',
        completed: process.documentosEnviados,
        active: process.currentStep === PurchaseStep.UPLOAD_DOCUMENTOS
      },
      {
        key: 'simulacao',
        label: 'Simulacao',
        completed: process.simulacaoAprovada && process.condicoesConfirmadas,
        active: [PurchaseStep.SIMULACAO_PAGAMENTO, PurchaseStep.CONFIRMACAO_CONDICOES].includes(process.currentStep)
      },
      {
        key: 'contrato',
        label: 'Contrato',
        completed: process.contratoGerado && process.contratoAssinado,
        active: [PurchaseStep.GERAR_CONTRATO, PurchaseStep.ASSINAR_CONTRATO].includes(process.currentStep)
      },
      {
        key: 'conclusao',
        label: 'Conclusao',
        completed: process.vendaConfirmada,
        active: process.currentStep === PurchaseStep.VENDA_CONFIRMADA
      }
    ];
  }

  private validateRequiredFields(dto: CustomerProfileDto, requirements: any[]) {
    const missing = requirements
      .filter((item) => item.required)
      .filter((item) => {
        const value = (dto as Record<string, any>)[item.field];
        return value === undefined || value === null || value === '';
      });

    if (missing.length) {
      throw new BadRequestException(
        `Preencha os campos obrigatorios: ${missing
          .map((item) => item.label || item.field)
          .join(', ')}`
      );
    }
  }

  private mapProfilePayload(dto: CustomerProfileDto) {
    return {
      ...(dto.name !== undefined && { name: dto.name || null }),
      ...(dto.email !== undefined && { email: dto.email?.toLowerCase() || null }),
      ...(dto.phone !== undefined && { phone: dto.phone || null }),
      ...(dto.cpf !== undefined && { cpf: dto.cpf || null }),
      ...(dto.rg !== undefined && { rg: dto.rg || null }),
      ...(dto.maritalStatus !== undefined && { maritalStatus: dto.maritalStatus || null }),
      ...(dto.occupation !== undefined && { occupation: dto.occupation || null }),
      ...(dto.monthlyIncome !== undefined && { monthlyIncome: dto.monthlyIncome }),
      ...(dto.address !== undefined && { address: dto.address || null }),
      ...(dto.addressCity !== undefined && { addressCity: dto.addressCity || null }),
      ...(dto.addressState !== undefined && { addressState: dto.addressState || null }),
      ...(dto.addressZip !== undefined && { addressZip: dto.addressZip || null })
    };
  }

  private async areRequiredDocumentsSatisfied(processId: string, projectId: string, tenantId: string) {
    const config = await this.ensureDefaultConfig(tenantId, projectId);
    const requiredTypes = config.documentRequirements
      .filter((item) => item.required)
      .map((item) => item.documentType);

    if (!requiredTypes.length) return true;

    const uploaded = await this.prisma.purchaseDocument.findMany({
      where: { processId },
      select: { documentType: true }
    });

    const uploadedTypes = new Set(uploaded.map((item) => item.documentType));
    return requiredTypes.every((item) => uploadedTypes.has(item));
  }

  private async recordEvent(
    processId: string,
    event: {
      tenantId: string;
      projectId: string;
      leadId: string;
      eventType: PurchaseFunnelEventType;
      step?: PurchaseStep;
      payload?: Record<string, any>;
    }
  ) {
    await this.prisma.purchaseFunnelEvent.create({
      data: {
        processId,
        tenantId: event.tenantId,
        projectId: event.projectId,
        leadId: event.leadId,
        eventType: event.eventType,
        step: event.step,
        payload: event.payload
      }
    });
  }

  private async transitionProcess(
    processId: string,
    nextStep: PurchaseStep,
    data: Record<string, any> = {}
  ) {
    const process = await this.prisma.purchaseProcess.findUnique({
      where: { id: processId }
    });
    if (!process) throw new NotFoundException('Processo nao encontrado.');

    const currentIndex = STEP_ORDER.indexOf(process.currentStep);
    const nextIndex = STEP_ORDER.indexOf(nextStep);

    if (nextIndex > currentIndex) {
      await this.finishStepTimeline(process.id, process.currentStep);
      await this.prisma.purchaseProcess.update({
        where: { id: process.id },
        data: {
          currentStep: nextStep,
          ...data
        }
      });
      await this.ensureStepTimeline(process.id, nextStep);
      return;
    }

    if (Object.keys(data).length) {
      await this.prisma.purchaseProcess.update({
        where: { id: process.id },
        data
      });
    }
  }

  private async ensureStepTimeline(
    processId: string,
    step: PurchaseStep,
    startedAt = new Date(),
    finishedAt?: Date
  ) {
    const existing = await this.prisma.purchaseStepSla.findUnique({
      where: {
        processId_step: {
          processId,
          step
        }
      }
    });

    if (!existing) {
      await this.prisma.purchaseStepSla.create({
        data: {
          processId,
          step,
          startedAt,
          ...(finishedAt && {
            finishedAt,
            durationSeconds: Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000))
          })
        }
      });
      return;
    }

    if (finishedAt && !existing.finishedAt) {
      await this.prisma.purchaseStepSla.update({
        where: { id: existing.id },
        data: {
          finishedAt,
          durationSeconds: Math.max(0, Math.round((finishedAt.getTime() - existing.startedAt.getTime()) / 1000))
        }
      });
    }
  }

  private async finishStepTimeline(processId: string, step: PurchaseStep) {
    const existing = await this.prisma.purchaseStepSla.findUnique({
      where: {
        processId_step: {
          processId,
          step
        }
      }
    });

    if (!existing || existing.finishedAt) return;

    const finishedAt = new Date();
    await this.prisma.purchaseStepSla.update({
      where: { id: existing.id },
      data: {
        finishedAt,
        durationSeconds: Math.max(
          0,
          Math.round((finishedAt.getTime() - existing.startedAt.getTime()) / 1000)
        )
      }
    });
  }

  private renderContractTemplate(process: any, contentTemplate: string) {
    const primaryClient = process.clients.find((item: any) => item.role === PurchasePartyRole.PRIMARY);
    const lot = process.lead.mapElement?.lotDetails;
    const simulation = process.simulationSnapshot || {};

    const replacements: Record<string, string> = {
      cliente_nome: primaryClient?.name || process.lead.name || '',
      cliente_cpf: primaryClient?.cpf || process.lead.cpf || '',
      lote_numero:
        process.lead.mapElement?.code || lot?.lotNumber || process.lead.mapElement?.name || '',
      quadra: lot?.block || '',
      valor_total: this.formatMoney(simulation.totalAmount ?? (lot?.price ? Number(lot.price) : 0)),
      entrada: this.formatMoney(simulation.entryAmount ?? 0),
      parcelas:
        simulation.numberInstallments && simulation.installmentAmount
          ? `${simulation.numberInstallments}x de ${this.formatMoney(simulation.installmentAmount)}`
          : ''
    };

    return contentTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return replacements[key] ?? '';
    });
  }

  private formatMoney(value: number) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  private createContractPdf(title: string, body: string) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(title, { align: 'left' });
      doc.moveDown();
      doc.fontSize(11).text(body, {
        align: 'left',
        lineGap: 4
      });
      doc.end();
    });
  }

  private serializeConfig(config: any) {
    return this.prisma.$transaction(async (tx) => {
      const [baseConfig, paymentTables, contractTemplates] = await Promise.all([
        tx.purchaseFlowConfig.findUnique({
          where: { id: config.id },
          include: {
            fieldRequirements: { orderBy: { sortOrder: 'asc' } },
            documentRequirements: { orderBy: { sortOrder: 'asc' } },
            project: { select: { id: true, name: true, slug: true } }
          }
        }),
        tx.purchasePaymentTable.findMany({
          where: { projectId: config.projectId },
          orderBy: { createdAt: 'asc' },
          include: {
            conditions: { orderBy: { numberInstallments: 'asc' } }
          }
        }),
        tx.contractTemplate.findMany({
          where: { projectId: config.projectId },
          orderBy: { createdAt: 'asc' }
        })
      ]);

      if (!baseConfig) return null;

      return {
        ...baseConfig,
        paymentTables,
        contractTemplates
      };
    });
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}