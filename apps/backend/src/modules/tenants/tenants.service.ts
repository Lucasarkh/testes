import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Inject
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
    @Inject('REDIS_SERVICE') private redis: any
  ) {}

  private nullable(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

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

    return this.prisma
      .$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.tenantName,
            slug,
            customDomain: this.nullable(dto.customDomain),
            cnpj: this.nullable(dto.cnpj),
            legalName: this.nullable(dto.legalName),
            stateRegistration: this.nullable(dto.stateRegistration),
            municipalRegistration: this.nullable(dto.municipalRegistration),
            legalRepresentative: this.nullable(dto.legalRepresentative),
            creci: this.nullable(dto.creci),
            phone: this.nullable(dto.phone),
            whatsapp: this.nullable(dto.whatsapp),
            publicEmail: this.nullable(dto.publicEmail),
            website: this.nullable(dto.website),
            contactName: this.nullable(dto.contactName),
            contactEmail: this.nullable(dto.contactEmail),
            contactPhone: this.nullable(dto.contactPhone),
            addressZipCode: this.nullable(dto.addressZipCode),
            addressStreet: this.nullable(dto.addressStreet),
            addressNumber: this.nullable(dto.addressNumber),
            addressComplement: this.nullable(dto.addressComplement),
            addressDistrict: this.nullable(dto.addressDistrict),
            addressCity: this.nullable(dto.addressCity),
            addressState: this.nullable(dto.addressState),
            addressCountry: this.nullable(dto.addressCountry)
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
      })
      .then(async (tenant) => {
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
      cnpj: t.cnpj,
      legalName: t.legalName,
      stateRegistration: t.stateRegistration,
      municipalRegistration: t.municipalRegistration,
      legalRepresentative: t.legalRepresentative,
      creci: t.creci,
      phone: t.phone,
      whatsapp: t.whatsapp,
      publicEmail: t.publicEmail,
      website: t.website,
      contactName: t.contactName,
      contactEmail: t.contactEmail,
      contactPhone: t.contactPhone,
      addressZipCode: t.addressZipCode,
      addressStreet: t.addressStreet,
      addressNumber: t.addressNumber,
      addressComplement: t.addressComplement,
      addressDistrict: t.addressDistrict,
      addressCity: t.addressCity,
      addressState: t.addressState,
      addressCountry: t.addressCountry,
      isActive: t.isActive,
      billingStatus: t.billingStatus || 'OK',
      stripeCustomerId: t.stripeCustomerId || null,
      billingEmail: t.billingEmail || null,
      gracePeriodEnd: t.gracePeriodEnd || null,
      pricingTableId: t.pricingTableId || null,
      discountPercent: t.discountPercent || 0,
      freeProjects: t.freeProjects || 0,
      trialStartedAt: t.trialStartedAt || null,
      trialMonths: t.trialMonths || 1,
      trialInterruptedAt: t.trialInterruptedAt || null,
      createdAt: t.createdAt,
      metrics: {
        brokers: t._count.users,
        projects: t._count.projects,
        leads: t._count.leads
      }
    }));
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        cnpj: true,
        legalName: true,
        stateRegistration: true,
        municipalRegistration: true,
        legalRepresentative: true,
        creci: true,
        phone: true,
        whatsapp: true,
        publicEmail: true,
        website: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        addressZipCode: true,
        addressStreet: true,
        addressNumber: true,
        addressComplement: true,
        addressDistrict: true,
        addressCity: true,
        addressState: true,
        addressCountry: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const data: any = {
      ...dto,
      customDomain: this.nullable(dto.customDomain),
      cnpj: this.nullable(dto.cnpj),
      legalName: this.nullable(dto.legalName),
      stateRegistration: this.nullable(dto.stateRegistration),
      municipalRegistration: this.nullable(dto.municipalRegistration),
      legalRepresentative: this.nullable(dto.legalRepresentative),
      creci: this.nullable(dto.creci),
      phone: this.nullable(dto.phone),
      whatsapp: this.nullable(dto.whatsapp),
      publicEmail: this.nullable(dto.publicEmail),
      website: this.nullable(dto.website),
      contactName: this.nullable(dto.contactName),
      contactEmail: this.nullable(dto.contactEmail),
      contactPhone: this.nullable(dto.contactPhone),
      addressZipCode: this.nullable(dto.addressZipCode),
      addressStreet: this.nullable(dto.addressStreet),
      addressNumber: this.nullable(dto.addressNumber),
      addressComplement: this.nullable(dto.addressComplement),
      addressDistrict: this.nullable(dto.addressDistrict),
      addressCity: this.nullable(dto.addressCity),
      addressState: this.nullable(dto.addressState),
      addressCountry: this.nullable(dto.addressCountry)
    };

    // Keep boolean updates intact when omitted from payload
    if (dto.isActive === undefined) delete data.isActive;

    // If slug is changing, check uniqueness
    if (dto.slug && dto.slug !== tenant.slug) {
      const existing = await this.prisma.tenant.findUnique({
        where: { slug: dto.slug }
      });
      if (existing) throw new ConflictException('Slug já em uso');
    }

    // If customDomain is changing, check uniqueness
    if (data.customDomain && data.customDomain !== tenant.customDomain) {
      const existing = await this.prisma.tenant.findUnique({
        where: { customDomain: data.customDomain }
      });
      if (existing) throw new ConflictException('Domínio já em uso');
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data
    });

    // Invalidate Redis cache when customDomain changes so the new mapping
    // takes effect immediately without waiting for the 5-minute TTL.
    if (data.customDomain !== undefined) {
      if (tenant.customDomain) {
        await this.redis.del(`domain_resolve:${tenant.customDomain}`);
      }
      if (data.customDomain && data.customDomain !== tenant.customDomain) {
        await this.redis.del(`domain_resolve:${data.customDomain}`);
      }
    }

    return updated;
  }

  async updateStatus(id: string, isActive: boolean) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive }
    });

    // BUG-02: flush all cached domain resolutions for this tenant so deactivation
    // takes effect immediately, without waiting for the 5-minute Redis TTL.
    const delKeys: Promise<any>[] = [];
    if (tenant.customDomain) {
      delKeys.push(this.redis.del(`domain_resolve:${tenant.customDomain}`));
    }
    const projects = await this.prisma.project.findMany({
      where: { tenantId: id },
      select: { slug: true, customDomain: true }
    });
    for (const p of projects) {
      delKeys.push(this.redis.del(`domain_resolve:subdomain:${p.slug}`));
      if (p.customDomain) {
        delKeys.push(this.redis.del(`domain_resolve:${p.customDomain}`));
      }
    }
    await Promise.all(delKeys);

    return updated;
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
        cnpj: true,
        legalName: true,
        stateRegistration: true,
        municipalRegistration: true,
        legalRepresentative: true,
        creci: true,
        phone: true,
        whatsapp: true,
        publicEmail: true,
        website: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        addressZipCode: true,
        addressStreet: true,
        addressNumber: true,
        addressComplement: true,
        addressDistrict: true,
        addressCity: true,
        addressState: true,
        addressCountry: true,
        logos: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, label: true, sortOrder: true }
        }
      }
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return {
      ...tenant,
      logos: Array.isArray(tenant.logos)
        ? tenant.logos.map((logo) => ({
            ...logo,
            url: this.s3.resolvePublicAssetUrl(logo.url) || logo.url
          }))
        : tenant.logos
    };
  }

  async updateProfile(tenantId: string, dto: UpdateTenantProfileDto) {
    await this.findSelf(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        cnpj: this.nullable(dto.cnpj),
        legalName: this.nullable(dto.legalName),
        stateRegistration: this.nullable(dto.stateRegistration),
        municipalRegistration: this.nullable(dto.municipalRegistration),
        legalRepresentative: this.nullable(dto.legalRepresentative),
        creci: this.nullable(dto.creci),
        phone: this.nullable(dto.phone),
        whatsapp: this.nullable(dto.whatsapp),
        publicEmail: this.nullable(dto.publicEmail),
        website: this.nullable(dto.website),
        contactName: this.nullable(dto.contactName),
        contactEmail: this.nullable(dto.contactEmail),
        contactPhone: this.nullable(dto.contactPhone),
        addressZipCode: this.nullable(dto.addressZipCode),
        addressStreet: this.nullable(dto.addressStreet),
        addressNumber: this.nullable(dto.addressNumber),
        addressComplement: this.nullable(dto.addressComplement),
        addressDistrict: this.nullable(dto.addressDistrict),
        addressCity: this.nullable(dto.addressCity),
        addressState: this.nullable(dto.addressState),
        addressCountry: this.nullable(dto.addressCountry)
      },
      select: {
        id: true,
        name: true,
        cnpj: true,
        legalName: true,
        stateRegistration: true,
        municipalRegistration: true,
        legalRepresentative: true,
        creci: true,
        phone: true,
        whatsapp: true,
        publicEmail: true,
        website: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        addressZipCode: true,
        addressStreet: true,
        addressNumber: true,
        addressComplement: true,
        addressDistrict: true,
        addressCity: true,
        addressState: true,
        addressCountry: true
      }
    });
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File) {
    await this.findSelf(tenantId);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const key = `tenants/${tenantId}/logos/${uuidv4()}${ext}`;
    await this.s3.upload(file.buffer, key, file.mimetype);
    const url = this.s3.publicAssetUrl(key);
    return this.prisma.tenantLogo.create({
      data: { tenantId, url },
      select: { id: true, url: true, label: true, sortOrder: true }
    });
  }

  async deleteLogo(tenantId: string, logoId: string) {
    const logo = await this.prisma.tenantLogo.findFirst({
      where: { id: logoId, tenantId }
    });
    if (!logo) throw new NotFoundException('Logo não encontrado');
    // Delete from S3
    try {
      const key = this.s3.keyFromUrl(logo.url);
      if (key) await this.s3.delete(key);
    } catch {
      /* ignore S3 cleanup errors */
    }
    await this.prisma.tenantLogo.delete({ where: { id: logoId } });
    return { ok: true };
  }
}
