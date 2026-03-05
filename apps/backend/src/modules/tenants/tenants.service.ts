import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RegisterTenantDto } from '../auth/dto/register-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { BillingService } from '../billing/billing.service';
import { S3Service } from '@infra/s3/s3.service';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
    private s3: S3Service,
  ) {}

  async create(dto: RegisterTenantDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });
    if (existingUser) throw new ConflictException('Email já cadastrado.');

    const slug = dto.tenantSlug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug }
    });
    if (existingTenant)
      throw new ConflictException('Slug de tenant já em uso.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug,
          customDomain: dto.customDomain || null
        }
      });

      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          role: UserRole.LOTEADORA
        }
      });

      return tenant;
    }).then(async (tenant) => {
      // Auto-assign default pricing table (outside transaction, non-blocking)
      try {
        await this.billingService.autoAssignDefaultPricingTable(tenant.id);
      } catch (err) {
        // Non-blocking — admin can assign manually later
      }
      return tenant;
    });
  }

  async findAll() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: { where: { role: UserRole.CORRETOR } },
            projects: true,
            leads: true
          }
        }
      }
    });

    // We can also compute metrics here or in a separate call
    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      customDomain: t.customDomain,
      isActive: t.isActive,
      billingStatus: t.billingStatus || 'OK',
      stripeCustomerId: t.stripeCustomerId || null,
      billingEmail: t.billingEmail || null,
      gracePeriodEnd: t.gracePeriodEnd || null,
      createdAt: t.createdAt,
      metrics: {
        brokers: t._count.users,
        projects: t._count.projects,
        leads: t._count.leads
      }
    }));
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const data: any = { ...dto };

    // Treat empty string as null for uniqueness
    if (data.customDomain === '') {
      data.customDomain = null;
    }

    // If slug is changing, check uniqueness
    if (dto.slug && dto.slug !== tenant.slug) {
      const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException('Slug já em uso');
    }

    // If customDomain is changing, check uniqueness
    if (data.customDomain && data.customDomain !== tenant.customDomain) {
      const existing = await this.prisma.tenant.findUnique({ where: { customDomain: data.customDomain } });
      if (existing) throw new ConflictException('Domínio já em uso');
    }

    return this.prisma.tenant.update({
      where: { id },
      data
    });
  }

  async updateStatus(id: string, isActive: boolean) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    return this.prisma.tenant.update({
      where: { id },
      data: { isActive }
    });
  }

  async resolveTenantByDomain(host: string) {
    // 1. Try project with custom domain
    const project = await this.prisma.project.findUnique({
      where: { customDomain: host },
      include: { tenant: true }
    });
    if (project) {
      return { type: 'project', data: project, tenant: project.tenant };
    }

    // 2. Try tenant with custom domain
    const tenant = await this.prisma.tenant.findUnique({
      where: { customDomain: host }
    });
    if (tenant) {
      return { type: 'tenant', data: tenant, tenant };
    }

    return null;
  }

  async delete(id: string) {
    // Usually we don't delete, just deactivate, but here's the option
    return this.prisma.tenant.delete({ where: { id } });
  }

  async findSelf(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        creci: true,
        phone: true,
        publicEmail: true,
        website: true,
        logos: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, label: true, sortOrder: true } },
      }
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async updateProfile(tenantId: string, dto: UpdateTenantProfileDto) {
    await this.findSelf(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { ...dto },
      select: {
        id: true,
        name: true,
        creci: true,
        phone: true,
        publicEmail: true,
        website: true,
      }
    });
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File) {
    await this.findSelf(tenantId);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const key = `tenants/${tenantId}/logos/${uuidv4()}${ext}`;
    const url = await this.s3.upload(file.buffer, key, file.mimetype);
    return this.prisma.tenantLogo.create({
      data: { tenantId, url },
      select: { id: true, url: true, label: true, sortOrder: true }
    });
  }

  async deleteLogo(tenantId: string, logoId: string) {
    const logo = await this.prisma.tenantLogo.findFirst({ where: { id: logoId, tenantId } });
    if (!logo) throw new NotFoundException('Logo não encontrado');
    // Delete from S3
    try {
      const key = logo.url.split('.amazonaws.com/').pop();
      if (key) await this.s3.delete(key);
    } catch { /* ignore S3 cleanup errors */ }
    await this.prisma.tenantLogo.delete({ where: { id: logoId } });
    return { ok: true };
  }
}
