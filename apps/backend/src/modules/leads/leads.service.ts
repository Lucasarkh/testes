import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from '@prisma/client';
import { LeadsQueryDto } from './dto/leads-query.dto';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';
import {
  CreateManualLeadDto,
  UpdateLeadStatusDto,
  AddLeadDocumentDto,
  AddLeadPaymentDto
} from './dto/manual-lead.dto';
import { NotificationsService } from '@modules/notifications/notifications.service';
import OpenAI from 'openai';
import axios from 'axios';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredReservations() {
    this.logger.log('Iniciando limpeza de reservas expiradas...');
    
    // Buscar todos os leads em reserva que tenham data de reserva
    const activeReservations = await this.prisma.lead.findMany({
      where: {
        status: 'RESERVATION',
        reservedAt: { not: null },
        project: { reservationExpiryHours: { gt: 0 } }
      },
      include: {
        project: true
      }
    });

    const now = new Date();
    let expiredCount = 0;

    for (const lead of activeReservations) {
      if (!lead.reservedAt) continue;
      
      const expiryHours = lead.project.reservationExpiryHours || 24;
      const expiryDate = new Date(lead.reservedAt.getTime() + expiryHours * 60 * 60 * 1000);

      if (now > expiryDate) {
        this.logger.log(`Expirando reserva do lead ${lead.id} do projeto ${lead.project.name}`);
        
        await this.prisma.$transaction(async (tx) => {
          // 1. Atualizar status do Lead
          await tx.lead.update({
            where: { id: lead.id },
            data: {
              status: 'ABANDONED',
              reservedAt: null,
              history: {
                create: {
                  fromStatus: 'RESERVATION',
                  toStatus: 'ABANDONED',
                  notes: `Reserva expirada automaticamente após ${expiryHours}h`,
                  createdBy: 'SYSTEM_CRON'
                }
              }
            }
          });

          // 2. Liberar lote se não houver outra reserva ativa (segurança)
          if (lead.mapElementId) {
            const othersCount = await tx.lead.count({
              where: {
                mapElementId: lead.mapElementId,
                status: { in: ['RESERVATION', 'WON'] },
                id: { not: lead.id }
              }
            });

            if (othersCount === 0) {
              await tx.lotDetails.update({
                where: { mapElementId: lead.mapElementId },
                data: { status: 'AVAILABLE' }
              });
            }
          }
        });
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`Limpeza concluída. ${expiredCount} reservas expiradas.`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendUncontactedLeadReminders() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const leads = await this.prisma.lead.findMany({
      where: {
        status: 'NEW',
        lastContactAt: null,
        phone: { not: null },
        createdAt: { lte: oneDayAgo },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    for (const lead of leads) {
      const elapsedDays = Math.floor((now.getTime() - lead.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      if (![1, 3, 7].includes(elapsedDays)) continue;

      const tag = `[WHAPI_FOLLOWUP_D${elapsedDays}]`;
      const alreadySent = await this.prisma.leadHistory.findFirst({
        where: {
          leadId: lead.id,
          createdBy: 'SYSTEM_WHAPI',
          notes: { contains: tag },
        },
        select: { id: true },
      });

      if (alreadySent) continue;

      await this.notifications.onLeadUncontactedFollowUp(lead.id, elapsedDays as 1 | 3 | 7);

      await this.prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          toStatus: lead.status,
          notes: `${tag} Alerta de lead sem atendimento enviado por WhatsApp`,
          createdBy: 'SYSTEM_WHAPI',
        },
      });
    }
  }

  /** Public – anyone can create a lead for a published project */
  async createPublic(projectSlug: string, dto: CreateLeadDto) {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug }
    });
    if (!project || project.status !== 'PUBLISHED')
      throw new NotFoundException('Project not found');

    const tenantId = project.tenantId;

    // 1. Deduplication logic (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existingLead = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        projectId: project.id,
        OR: [
          ...(dto.email ? [{ email: { equals: dto.email, mode: 'insensitive' as any } }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : [])
        ],
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    const isRecurrent = !!existingLead;

    // 2. Attribution from Session
    let attributionData: any = {};
    let sessionRealtorLinkId: string | null = null;

    if (dto.sessionId) {
      const session = await this.prisma.trackingSession.findUnique({
        where: { id: dto.sessionId }
      });

      if (session) {
        sessionRealtorLinkId = session.realtorLinkId;
        attributionData = {
          ftUtmSource: session.ftUtmSource,
          ftUtmMedium: session.ftUtmMedium,
          ftUtmCampaign: session.ftUtmCampaign,
          ftUtmContent: session.ftUtmContent,
          ftUtmTerm: session.ftUtmTerm,
          ltUtmSource: session.ltUtmSource,
          ltUtmMedium: session.ltUtmMedium,
          ltUtmCampaign: session.ltUtmCampaign,
          ltUtmContent: session.ltUtmContent,
          ltUtmTerm: session.ltUtmTerm,
          ltReferrer: session.ltReferrer
        };
      }
    }

    // 3. Resolve Realtor (explicit code OR session attribution)
    let realtorLinkId: string | undefined;
    if (dto.realtorCode) {
      const rl = await this.prisma.realtorLink.findFirst({
        where: {
          tenantId,
          code: dto.realtorCode,
          enabled: true
        }
      });
      realtorLinkId = rl?.id;
    } else if (sessionRealtorLinkId) {
      // Use realtor from session attribution if no explicit code provided
      realtorLinkId = sessionRealtorLinkId;
    }

    const { realtorCode, mapElementId, sessionId, aiChatTranscript: rawTranscript, ...leadData } = dto;

    // Validate if mapElementId exists within this project to avoid FK errors
    let validMapElementId: string | undefined;
    let lotCode: string | undefined;
    if (
      mapElementId &&
      typeof mapElementId === 'string' &&
      mapElementId.trim().length > 0
    ) {
      const exists = await this.prisma.mapElement.findFirst({
        where: { id: mapElementId, projectId: project.id, tenantId },
        select: { id: true, code: true }
      });
      if (exists) {
        validMapElementId = exists.id;
        lotCode = exists.code || undefined;
      }
    }

    // Validate and sanitize AI chat transcript
    let sanitizedTranscript: string | null = null;
    if (rawTranscript) {
      try {
        const parsed = JSON.parse(rawTranscript);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed
            .filter((m: any) => m.role && m.text)
            .map((m: any) => ({ role: String(m.role), text: String(m.text) }));
          if (cleaned.length > 0) {
            sanitizedTranscript = JSON.stringify(cleaned);
          }
        }
      } catch {
        this.logger.warn(`Invalid aiChatTranscript JSON for lead in project ${projectSlug}`);
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        projectId: project.id,
        ...leadData,
        ...(validMapElementId ? { mapElementId: validMapElementId } : {}),
        realtorLinkId: realtorLinkId || null,
        sessionId: sessionId || null,
        isRecurrent,
        ...attributionData,
        aiChatTranscript: sanitizedTranscript,
        source: sanitizedTranscript
          ? (realtorCode ? `corretor:${realtorCode}:ai_chat` : 'website:ai_chat')
          : realtorCode
            ? `corretor:${realtorCode}`
            : realtorLinkId
            ? 'corretor:atribuição'
            : 'website'
      }
    });

    // Record history for new leads
    await this.prisma.leadHistory.create({
      data: {
        leadId: lead.id,
        toStatus: LeadStatus.NEW,
        notes: isRecurrent
          ? 'Lead recorrente detectado'
          : sanitizedTranscript
          ? 'Lead criado via site (interagiu com IA)'
          : 'Lead criado via site',
        createdBy: 'SYSTEM'
      }
    });

    // Fire-and-forget: notify panel users about the new lead
    this.notifications
      .onNewLead(tenantId, project.id, project.name, realtorLinkId ?? null, {
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        lotCode: lotCode ?? null,
        sendLeadWelcome: true,
      })
      .catch((e) => this.logger.error('Notification onNewLead (public)', e.message));

    // Fire-and-forget: generate AI summary of the chat transcript
    if (sanitizedTranscript) {
      this.generateAiChatSummary(lead.id, sanitizedTranscript, project.id, tenantId)
        .catch((e) => this.logger.error('AI summary generation failed', e.message));
    }

    return lead;
  }

  /** Panel – create lead manually by Realtor or Developer */
  async createManual(
    tenantId: string,
    dto: CreateManualLeadDto,
    user: { id: string; role: string; name: string }
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Project not found');

    let realtorLinkId: string | undefined;

    // If Realtor is creating, link to them
    if (user.role === 'CORRETOR') {
      const rl = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      realtorLinkId = rl?.id;
    } else if (dto.realtorCode) {
      // Developer can assign a realtor by code
      const rl = await this.prisma.realtorLink.findFirst({
        where: { code: dto.realtorCode, tenantId }
      });
      realtorLinkId = rl?.id;
    }

    const { realtorCode, mapElementId, sessionId, projectId, ...data } = dto;

    const createdLead = await this.prisma.$transaction(async (tx) => {
      // Check lot availability if setting WON/RESERVATION status
      if (
        mapElementId &&
        (dto.status === 'WON' || dto.status === 'RESERVATION')
      ) {
        const lot = await tx.lotDetails.findUnique({
          where: { mapElementId }
        });
        
        if (lot) {
          if (dto.status === 'WON' && lot.status === 'SOLD') {
            throw new BadRequestException('O lote já foi vendido.');
          }

          if (dto.status === 'RESERVATION') {
            if (lot.status !== 'AVAILABLE') {
              // Even if it is RESERVED, it might be for another lead. 
              // We only allow reservation if it's AVAILABLE.
              throw new BadRequestException('O lote não está disponível para reserva.');
            }

            // Check if there's any other lead that is currently reserving this lot
            const activeLead = await tx.lead.findFirst({
              where: {
                mapElementId,
                status: { in: ['RESERVATION', 'WON'] }
              }
            });
            if (activeLead) {
              throw new BadRequestException('Já existe uma reserva ativa para este lote.');
            }
          }
        }
      }

      const lead = await tx.lead.create({
        data: {
          ...data,
          tenantId,
          projectId,
          mapElementId,
          realtorLinkId,
          source: user.role === 'CORRETOR' ? 'corretor_manual' : user.role === 'IMOBILIARIA' ? 'imobiliaria_manual' : 'loteadora_manual',
          status: dto.status || 'NEW',
          reservedAt: dto.status === 'RESERVATION' ? new Date() : null,
          history: {
            create: {
              toStatus: dto.status || 'NEW',
              notes: 'Lead criado manualmente',
              createdBy: user.name || user.id
            }
          }
        }
      });

      // Sync status if WON or RESERVATION
      if (
        mapElementId &&
        (dto.status === 'WON' || dto.status === 'RESERVATION')
      ) {
        const newStatus = dto.status === 'WON' ? 'SOLD' : 'RESERVED';
        await tx.lotDetails.update({
          where: { mapElementId },
          data: { status: newStatus as any }
        });
      }

      return lead;
    });

    // Fire-and-forget: notify panel users about the new manual lead
    this.notifications
      .onNewLead(tenantId, project.id, project.name, realtorLinkId ?? null, {
        leadId: createdLead.id,
        leadName: createdLead.name,
        leadPhone: createdLead.phone,
        sendLeadWelcome: false,
      })
      .catch((e) => this.logger.error('Notification onNewLead (manual)', e.message));

    return createdLead;
  }

  /** Panel – list leads with optional filters */
  async findAll(
    tenantId: string,
    query: LeadsQueryDto,
    user: { id: string; role: string; agencyId?: string }
  ): Promise<PaginatedResponse<any>> {
    const { projectId, status, search, mapElementId, realtorLinkId: queryRealtorLinkId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // ... (rest of the realtor logic)
    let realtorLinkId: string | undefined;
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      realtorLinkId = realtor?.id || 'none';
    } else if (queryRealtorLinkId) {
      // LOTEADORA/IMOBILIARIA/SYSADMIN can filter by a specific corretor
      realtorLinkId = queryRealtorLinkId;
    }

    // New Agency restriction
    let agencyId: string | undefined;
    if (user.role === 'IMOBILIARIA') {
      agencyId = user.agencyId || 'none';
    }

    const where = {
      tenantId,
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(realtorLinkId && { realtorLinkId }),
      ...(agencyId && {
        OR: [
          { realtorLink: { user: { agencyId } } },
          { realtorLink: { user: null } } // This might need careful thought, but usually imobiliária only sees their team
        ]
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
          { phone: { contains: search } }
        ]
      })
    };
    
    // Correction for Agency filter: strictly team leads
    if (user.role === 'IMOBILIARIA') {
        const agencyId = user.agencyId;
        (where as any).realtorLink = { user: { agencyId } };
        delete (where as any).OR; // Clean up the search OR if we need to combine them, but here we just want to ensure agency
    }
    
    // Final where construction for agency search
    const finalWhere = {
      tenantId,
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(mapElementId && { mapElementId }),
      ...(realtorLinkId && { realtorLinkId }),
      ...(user.role === 'IMOBILIARIA' && { realtorLink: { user: { agencyId: user.agencyId } } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
          { phone: { contains: search } }
        ]
      })
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.lead.findMany({
        where: finalWhere as any,
        include: {
          project: true,
          realtorLink: { 
            include: { user: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.lead.count({ where: finalWhere as any })
    ]);

    // Mask data for Realtors
    const processedData = data.map((lead) => this.maskLeadData(lead, user));

    return {
      data: processedData,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
      }
    };
  }

  async findOne(
    tenantId: string,
    id: string,
    user: { id: string; role: string }
  ) {
    // If user is a realtor, they can only see their own lead
    let realtorLinkId: string | undefined;
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      realtorLinkId = realtor?.id || 'none';
    }

    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        tenantId,
        ...(realtorLinkId && { realtorLinkId })
      },
      include: {
        project: true,
        mapElement: true,
        realtorLink: true,
        documents: true,
        payments: true,
        history: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.maskLeadData(lead, user);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateLeadDto,
    user: { id: string; role: string; name: string }
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    // Permission check for Realtor
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      if (lead.realtorLinkId !== realtor?.id) {
        throw new ForbiddenException('You do not have access to this lead');
      }
    }

    const { realtorCode, mapElementId, projectId, ...data } = dto;

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...data,
        ...(mapElementId ? { mapElementId } : {})
      }
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateLeadStatusDto,
    user: { id: string; role: string; name: string }
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    // Only LOTEADORA/SYSADMIN can mark as REVERSED (Estorno)
    if (['CORRETOR', 'IMOBILIARIA'].includes(user.role) && dto.status === 'REVERSED') {
      throw new ForbiddenException('Apenas a loteadora pode realizar estornos');
    }

    // Permission check for Realtors (they must own the lead)
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      if (lead.realtorLinkId !== realtor?.id) {
        throw new ForbiddenException('You do not have access to this lead');
      }
    }

    // Permission check for Imobiliárias (they can only manage leads from their agency's realtors)
    if (user.role === 'IMOBILIARIA') {
      const agencyUser = await this.prisma.user.findUnique({ where: { id: user.id }, select: { agencyId: true } });
      if (agencyUser?.agencyId && lead.realtorLinkId) {
        const realtor = await this.prisma.realtorLink.findUnique({ where: { id: lead.realtorLinkId }, select: { agencyId: true } });
        if (realtor?.agencyId !== agencyUser.agencyId) {
          throw new ForbiddenException('Você não tem acesso a este lead');
        }
      }
    }

    const updatedLead = await this.prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          status: dto.status,
          lastContactAt: new Date(),
          reservedAt: dto.status === 'RESERVATION' ? new Date() : (dto.status === 'WON' ? undefined : null),
          history: {
            create: {
              fromStatus: lead.status,
              toStatus: dto.status,
              notes: dto.notes,
              createdBy: user.name || user.id
            }
          }
        }
      });

      // Synchronize Lot status
      if (lead.mapElementId) {
        const lot = await tx.lotDetails.findUnique({
          where: { mapElementId: lead.mapElementId }
        });

        if (lot) {
          if (dto.status === 'RESERVATION') {
            // Se já estava reservado por este lead, permitimos renovar a reserva (reservedAt atualiza no update do lead)
            // Se estava disponível, reservamos.
            if (lot.status !== 'AVAILABLE' && lot.status !== 'RESERVED') {
              throw new BadRequestException('O lote não está disponível para reserva.');
            }
            
            // Check if there's any other lead that is currently reserving this lot
            const activeLead = await tx.lead.findFirst({
              where: {
                mapElementId: lead.mapElementId,
                status: { in: ['RESERVATION', 'WON'] },
                id: { not: lead.id }
              }
            });
            if (activeLead) {
              throw new BadRequestException('O lote já está reservado para outro cliente.');
            }

            if (lot.status === 'AVAILABLE') {
              await tx.lotDetails.update({ where: { id: lot.id }, data: { status: 'RESERVED' } });
            }
          } else if (dto.status === 'WON') {
            if (lot.status === 'SOLD') {
              throw new BadRequestException('O lote já foi vendido.');
            }
            // Check if someone else owns it in reservation
            const otherReserver = await tx.lead.findFirst({
                where: {
                    mapElementId: lead.mapElementId,
                    status: 'RESERVATION',
                    id: { not: lead.id }
                }
            });
            if (otherReserver) {
                // Se o dono for outro, não permitimos vender
                throw new BadRequestException('O lote está reservado por outro corretor.');
            }

            await tx.lotDetails.update({ where: { id: lot.id }, data: { status: 'SOLD' } });
          } else if (
            ['CANCELLED', 'LOST', 'ABANDONED', 'REVERSED'].includes(dto.status)
          ) {
            const othersCount = await tx.lead.count({
              where: {
                mapElementId: lead.mapElementId,
                status: { in: ['RESERVATION', 'WON'] },
                id: { not: lead.id }
              }
            });
            if (othersCount === 0) {
              await tx.lotDetails.update({ where: { id: lot.id }, data: { status: 'AVAILABLE' } });
            }
          }
        }
      }

      return updatedLead;
    });

    if (dto.status === 'RESERVATION') {
      this.notifications
        .onLeadReservationConfirmed(id, 'PAINEL')
        .catch((e) => this.logger.error('Notification onLeadReservationConfirmed (panel)', e.message));
    }

    return updatedLead;
  }

  async addDocument(
    tenantId: string,
    leadId: string,
    dto: AddLeadDocumentDto,
    user: { id: string; role: string; name: string }
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    // Permission check for Corretor
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      if (lead.realtorLinkId !== realtor?.id) {
        throw new ForbiddenException('You do not have access to this lead');
      }
    }

    return this.prisma.leadDocument.create({
      data: {
        leadId,
        ...dto,
        uploadedBy: user.name || user.id
      }
    });
  }

  async addPayment(
    tenantId: string,
    leadId: string,
    dto: AddLeadPaymentDto,
    user: { id: string; role: string; name: string }
  ) {
    if (user.role === 'CORRETOR') {
      throw new ForbiddenException('Only Developers can manage lead payments');
    }

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.leadPayment.create({
      data: {
        leadId,
        ...dto
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.lead.delete({
      where: { id }
    });
  }

  /** Masks sensitive data if user is a Realtor */
  private maskLeadData(lead: any, user: { role: string }) {
    if (user.role !== 'CORRETOR') return lead;

    const { payments, ...maskedLead } = lead;

    // As per requirement "corretor não deve ter acesso a dados sensiveis"
    return {
      ...maskedLead,
      payments: []
    };
  }

  /**
   * Generates an AI summary of a chat transcript and stores it on the lead.
   * Called fire-and-forget after lead creation to avoid blocking the user.
   */
  private async generateAiChatSummary(
    leadId: string,
    transcript: string,
    projectId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const messages: { role: string; text: string }[] = JSON.parse(transcript);

      // Strip LOT_CARD blocks from AI messages for a cleaner summary input
      const cleanedMessages = messages.map(m => ({
        role: m.role,
        text: m.role === 'ai'
          ? m.text.replace(/:::LOT_CARD[\s\S]*?:::/g, '[Sugestão de lote]').trim()
          : m.text
      }));

      const conversationText = cleanedMessages
        .map(m => `${m.role === 'user' ? 'Visitante' : 'Assistente IA'}: ${m.text}`)
        .join('\n');

      // Look up the project's AI config to reuse the same provider/key
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, tenantId },
        include: { aiConfig: true }
      });

      const aiConfig = project?.aiConfig;
      if (!aiConfig?.apiKey) {
        const fallback = this.buildFallbackSummary(cleanedMessages);
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { aiChatSummary: fallback }
        });
        return;
      }

      const apiKey = aiConfig.apiKey;
      const provider = (aiConfig.provider || 'OPENAI').toUpperCase();

      const summaryPrompt = `Você é um assistente que resume conversas de atendimento imobiliário.
Analise a conversa abaixo entre um visitante e o assistente virtual de um loteamento.
Gere um resumo CONCISO (máximo 3-4 frases) em português brasileiro contendo:
1. O que o visitante estava procurando (tipo de lote, características, faixa de preço)
2. Quais lotes foram sugeridos pela IA (se houver)
3. Nível de interesse aparente (baixo, médio, alto)

Conversa:
${conversationText}

Resumo:`;

      let summary: string;

      if (provider === 'OPENAI') {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: summaryPrompt }],
          temperature: 0.3,
          max_tokens: 300,
        });
        summary = response.choices[0].message.content || '';
      } else if (provider === 'ANTHROPIC') {
        const resp = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 300,
            messages: [{ role: 'user', content: summaryPrompt }],
            temperature: 0.3,
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
          }
        );
        summary = resp.data.content[0].text;
      } else {
        // Google or unsupported: use fallback
        summary = this.buildFallbackSummary(cleanedMessages);
      }

      await this.prisma.lead.update({
        where: { id: leadId },
        data: { aiChatSummary: summary }
      });

      this.logger.log(`AI summary generated for lead ${leadId}`);
    } catch (error) {
      this.logger.error(`Failed to generate AI summary for lead ${leadId}:`, error.message);
    }
  }

  /**
   * Builds a simple text summary from the transcript without calling an LLM.
   */
  private buildFallbackSummary(messages: { role: string; text: string }[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    const messageCount = messages.length;
    const userMsgCount = userMessages.length;
    const topics = userMessages.map(m => m.text).join(' | ');

    return `Visitante interagiu com o chatbot de IA (${messageCount} mensagens, ${userMsgCount} do visitante). Perguntas: ${topics.substring(0, 500)}`;
  }
}
