import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { LeadStatus } from '@prisma/client';
import { WhapiService } from '@infra/whapi/whapi.service';

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly whapi: WhapiService
  ) {}

  async getPublicSettings() {
    const s = await this.prisma.systemSetting.findFirst();
    return (
      s || {
        contactWhatsapp: null,
        contactEmail: null,
        leadFormEnabled: true
      }
    );
  }

  async updateSettings(dto: {
    contactWhatsapp?: string;
    contactEmail?: string;
    leadFormEnabled?: boolean;
  }) {
    const existing = await this.prisma.systemSetting.findFirst();
    if (existing) {
      return this.prisma.systemSetting.update({
        where: { id: existing.id },
        data: dto
      });
    }
    return this.prisma.systemSetting.create({
      data: dto
    });
  }

  async createLead(dto: {
    name: string;
    email?: string;
    phone?: string;
    message?: string;
  }) {
    const lead = await this.prisma.systemLead.create({
      data: {
        ...dto,
        status: LeadStatus.NEW
      }
    });

    this.notifyLandingLeadWhatsapp(lead).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify landing lead on WhatsApp: ${detail}`);
    });

    return lead;
  }

  async findAllLeads() {
    return this.prisma.systemLead.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateLeadStatus(id: string, status: LeadStatus) {
    return this.prisma.systemLead.update({
      where: { id },
      data: { status }
    });
  }

  async getMaintenanceStatus(): Promise<{
    enabled: boolean;
    message: string;
    enabledAt: string | null;
    enabledBy: string | null;
  }> {
    const meta = await this.prisma.systemMeta.findUnique({
      where: { key: 'maintenance_mode' }
    });

    if (!meta || !meta.value) {
      return { enabled: false, message: '', enabledAt: null, enabledBy: null };
    }

    try {
      return JSON.parse(meta.value);
    } catch {
      return { enabled: false, message: '', enabledAt: null, enabledBy: null };
    }
  }

  async setMaintenanceMode(
    enabled: boolean,
    message: string,
    userId: string
  ): Promise<{
    enabled: boolean;
    message: string;
    enabledAt: string | null;
    enabledBy: string | null;
  }> {
    const value = JSON.stringify({
      enabled,
      message: message || 'Sistema em manutenção. Voltaremos em breve.',
      enabledAt: enabled ? new Date().toISOString() : null,
      enabledBy: enabled ? userId : null
    });

    await this.prisma.systemMeta.upsert({
      where: { key: 'maintenance_mode' },
      update: { value },
      create: { key: 'maintenance_mode', value }
    });

    return JSON.parse(value);
  }

  private async notifyLandingLeadWhatsapp(lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    message: string | null;
    createdAt: Date;
  }) {
    const settings = await this.prisma.systemSetting.findFirst({
      select: { contactWhatsapp: true }
    });

    if (!settings?.contactWhatsapp) {
      this.logger.warn(
        `Landing lead ${lead.id} was created without a configured contactWhatsapp destination.`
      );
      return;
    }

    const submittedAt = lead.createdAt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short'
    });

    const messageLines = [
      'Novo contato na landing do Lotio.',
      `Nome: ${lead.name}`,
      lead.email ? `E-mail: ${lead.email}` : null,
      lead.phone ? `WhatsApp: ${lead.phone}` : null,
      lead.message ? `Mensagem: ${lead.message}` : null,
      `Recebido em: ${submittedAt}`,
      `Lead ID: ${lead.id}`
    ].filter((line): line is string => Boolean(line));

    const sent = await this.whapi.sendText(
      settings.contactWhatsapp,
      messageLines.join('\n')
    );

    if (!sent) {
      this.logger.warn(
        `Landing lead ${lead.id} WhatsApp notification was not sent successfully.`
      );
    }
  }
}
