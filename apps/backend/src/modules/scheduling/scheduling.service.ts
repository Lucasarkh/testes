import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateSchedulingDto } from './dto/create-scheduling.dto';
import { UpdateSchedulingConfigDto } from './dto/update-scheduling-config.dto';
import { SchedulingStatus } from '@prisma/client';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getProjectConfig(projectId: string) {
    let config = await this.prisma.schedulingConfig.findUnique({
      where: { projectId },
    });

    if (!config) {
      config = await this.prisma.schedulingConfig.create({
        data: {
          projectId,
          enabled: false,
          scheduleInterval: 60,
          leadCaptureRequired: true,
          availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
          startTime: '08:00',
          endTime: '18:00',
          maxSimultaneous: 1,
        },
      });
    }

    return config;
  }

  async getProjectConfigBySlug(slug: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Empreendimento não encontrado');
    return this.getProjectConfig(project.id);
  }

  async updateProjectConfig(projectId: string, updateDto: UpdateSchedulingConfigDto) {
    return this.prisma.schedulingConfig.update({
      where: { projectId },
      data: updateDto,
    });
  }

  async createScheduling(tenantId: string, userId: string | null, dto: CreateSchedulingDto) {
    const { projectId, scheduledAt, leadId, notes, leadName, leadEmail, leadPhone, realtorCode } = dto;
    const date = new Date(scheduledAt);

    if (!projectId || projectId === '') throw new BadRequestException('ID do projeto é obrigatório.');

    const config = await this.getProjectConfig(projectId);

    if (!userId && !config.enabled) {
      throw new BadRequestException('Agendamentos estão desabilitados para este empreendimento.');
    }

    // Check if slot is available
    const existingSchedulings = await this.prisma.scheduling.count({
      where: {
        projectId,
        scheduledAt: date,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (existingSchedulings >= config.maxSimultaneous) {
      throw new ConflictException('Este horário já está totalmente preenchido.');
    }

    // Basic business hours validation (for clients mostly)
    if (!userId) {
      const dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(date).toUpperCase();
      
      const availableDays = (config.availableDays as string[]) || [];
      if (!availableDays.includes(dayOfWeek as any)) {
        throw new BadRequestException('Agendamentos não disponíveis neste dia da semana para este empreendimento.');
      }

      // Convert UTC date to local time comparison string using Brasilia offset/location
      const timeString = date.toLocaleTimeString('pt-BR', { 
         timeZone: 'America/Sao_Paulo', 
         hour: '2-digit', 
         minute: '2-digit', 
         hour12: false 
      });
      
      if (timeString < config.startTime || timeString > config.endTime) {
        throw new BadRequestException(`Agendamentos disponíveis apenas entre ${config.startTime} e ${config.endTime}.`);
      }

      // Check lunch time
      if (config.lunchStart && config.lunchEnd) {
        if (timeString >= config.lunchStart && timeString < config.lunchEnd) {
          throw new BadRequestException('Este horário coincide com o intervalo de almoço.');
        }
      }

      // Check custom breaks
      if (config.breaks && Array.isArray(config.breaks)) {
        for (const b of config.breaks as any[]) {
          if (timeString >= b.start && timeString < b.end) {
            throw new BadRequestException('Este horário está bloqueado por um intervalo programado.');
          }
        }
      }
    }

    let finalLeadId = leadId && leadId !== '' ? leadId : null;

    // MANDATORY LEAD CHECK
    if (!finalLeadId && !leadName) {
      throw new BadRequestException('É necessário selecionar um lead existente ou preencher o nome para um novo lead.');
    }

    if (!finalLeadId && leadName) {
      // Find realtor link if code exists
      let realtorLinkId: string | undefined = undefined;
      if (realtorCode) {
        const link = await this.prisma.realtorLink.findFirst({
           where: { 
             projects: { some: { id: projectId } }, 
             OR: [
               { id: realtorCode },
               { code: realtorCode }
             ]
           }
        }).catch(() => null);
        
        if (link) realtorLinkId = link.id;
      }

      const lead = await this.prisma.lead.create({
        data: {
          tenantId,
          projectId,
          realtorLinkId,
          name: leadName, // Type is now guaranteed to be string
          email: leadEmail,
          phone: leadPhone,
          status: 'NEW',
          source: userId ? 'PAINEL_AGENDAMENTO' : 'SITE_AGENDAMENTO',
        },
      });
      finalLeadId = lead.id;
    }

    const scheduling = await this.prisma.scheduling.create({
      data: {
        tenantId,
        projectId,
        leadId: finalLeadId,
        userId,
        scheduledAt: date,
        notes,
        status: userId ? 'CONFIRMED' : 'PENDING',
      },
      include: {
        lead: true,
        user: {
          select: { id: true, name: true, email: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    });

    // Fire-and-forget: notify loteadora users about the new scheduling
    this.notifications
      .onNewScheduling(tenantId, projectId, scheduling.project.name, scheduling.id)
      .catch((e) => this.logger.error('Notification onNewScheduling', e.message));

    if (!userId) {
      this.notifications
        .onPublicSchedulingCreated(scheduling.id)
        .catch((e) => this.logger.error('Notification onPublicSchedulingCreated', e.message));
    }

    return scheduling;
  }

  async listSchedulings(tenantId: string, projectId: string | undefined, user: any) {
    const isBroker = user.role === 'CORRETOR';
    const isAgency = user.role === 'IMOBILIARIA';

    return this.prisma.scheduling.findMany({
      where: {
        tenantId,
        ...(projectId && { projectId }),
        ...(isBroker && {
          OR: [
            { userId: user.id },
            { lead: { realtorLink: { userId: user.id } } },
          ],
        }),
        ...(isAgency && {
          OR: [
            { user: { agencyId: user.agencyId } },
            { lead: { realtorLink: { agencyId: user.agencyId } } },
          ],
        }),
      },
      include: {
        lead: true,
        user: {
          select: { id: true, name: true, role: true }
        },
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });
  }

  async updateSchedulingStatus(id: string, status: SchedulingStatus) {
    return this.prisma.scheduling.update({
      where: { id },
      data: { status },
    });
  }

  async getBusySlots(projectSlug: string, dateStr: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');

    const config = await this.getProjectConfig(project.id);
    
    // Create range for the date explicitly in Brasilia time to find all bookings for THAT day
    const startOfDay = new Date(dateStr + 'T00:00:00-03:00');
    const endOfDay = new Date(dateStr + 'T23:59:59-03:00');

    const schedulings = await this.prisma.scheduling.findMany({
      where: {
        projectId: project.id,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { scheduledAt: true },
    });

    const slotCounts: Record<string, number> = {};
    schedulings.forEach(s => {
      // Use Brasilia time to find the busy slots correctly
      const timeInBrasilia = s.scheduledAt.toLocaleTimeString('pt-BR', { 
         timeZone: 'America/Sao_Paulo', 
         hour: '2-digit', 
         minute: '2-digit',
         hour12: false
      });
      slotCounts[timeInBrasilia] = (slotCounts[timeInBrasilia] || 0) + 1;
    });

    return Object.keys(slotCounts).filter(time => slotCounts[time] >= config.maxSimultaneous);
  }

  async createPublic(projectSlug: string, dto: CreateSchedulingDto) {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, tenantId: true },
    });

    if (!project) {
      throw new NotFoundException('Empreendimento não encontrado');
    }

    return this.createScheduling(project.tenantId, null, {
      ...dto,
      projectId: project.id,
    });
  }

  async deleteScheduling(id: string) {
    return this.prisma.scheduling.delete({
      where: { id },
    });
  }
}
