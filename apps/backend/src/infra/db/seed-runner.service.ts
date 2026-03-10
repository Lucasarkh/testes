import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  UserRole,
  ProjectStatus,
  MapElementType,
  GeometryType,
  LotStatus,
  SlopeType,
  LeadStatus
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SEED_KEY = 'seed:initial';

@Injectable()
export class SeedRunnerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedRunnerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.runIfNeeded();
    } catch (err) {
      this.logger.error('Seed runner failed', err);
    }
  }

  /**
   * Only runs seed if the key does not yet exist in SystemMeta.
   * Safe for every startup & every pipeline run.
   */
  private async runIfNeeded() {
    const existing = await this.prisma.systemMeta.findUnique({
      where: { key: SEED_KEY }
    });

    if (existing) {
      this.logger.log('Seed already applied — skipping');
      return;
    }

    this.logger.log('First run detected — applying initial seed…');
    await this.applySeed();

    await this.prisma.systemMeta.create({
      data: {
        key: SEED_KEY,
        value: new Date().toISOString()
      }
    });

    this.logger.log('Initial seed completed and marked ✅');
  }

  // ────────────────────────────────────────────────────────
  //  Seed data (mirrors prisma/seed.ts but idempotent)
  // ────────────────────────────────────────────────────────
  private async applySeed() {
    const passwordHash = await bcrypt.hash('admin123', 10);

    // ─── SysAdmin ────────────────────────────────────────
    await this.prisma.user.create({
      data: {
        name: 'Sistema Admin',
        email: 'admin@sistema.com',
        passwordHash,
        role: UserRole.SYSADMIN
      }
    });

    // ─── Tenant 1 ────────────────────────────────────────
    const tenant1 = await this.prisma.tenant.create({
      data: {
        name: 'Loteadora Vista Verde',
        slug: 'vista-verde'
      }
    });

    await this.prisma.user.create({
      data: {
        tenantId: tenant1.id,
        name: 'Carlos Admin',
        email: 'admin@vistaverde.com',
        passwordHash,
        role: UserRole.LOTEADORA
      }
    });

    await this.prisma.user.create({
      data: {
        tenantId: tenant1.id,
        name: 'Ana Editora',
        email: 'editor@vistaverde.com',
        passwordHash,
        role: UserRole.LOTEADORA
      }
    });

    // ─── Project 1 ───────────────────────────────────────
    const project1 = await this.prisma.project.create({
      data: {
        tenantId: tenant1.id,
        name: 'Residencial Parque dos Ipês',
        slug: 'parque-dos-ipes',
        description: 'Loteamento residencial com 120 lotes, área verde e lago.',
        status: ProjectStatus.PUBLISHED
      }
    });

    // ─── Lots ────────────────────────────────────────────
    const lot1 = await this.prisma.mapElement.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        type: MapElementType.LOT,
        name: 'Quadra A - Lote 01',
        code: 'QA-L01',
        geometryType: GeometryType.POLYGON,
        geometryJson: {
          points: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 200, y: 180 },
            { x: 100, y: 180 }
          ],
          transform: {
            x: 0,
            y: 0,
            rotation: 0,
            skewX: 0,
            skewY: 0,
            scaleX: 1,
            scaleY: 1
          }
        },
        styleJson: {
          fill: '#22c55e',
          stroke: '#15803d',
          opacity: 0.7,
          zIndex: 10
        },
        metaJson: { quadra: 'A' }
      }
    });

    const lot2 = await this.prisma.mapElement.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        type: MapElementType.LOT,
        name: 'Quadra A - Lote 02',
        code: 'QA-L02',
        geometryType: GeometryType.POLYGON,
        geometryJson: {
          points: [
            { x: 200, y: 100 },
            { x: 300, y: 100 },
            { x: 300, y: 180 },
            { x: 200, y: 180 }
          ],
          transform: {
            x: 0,
            y: 0,
            rotation: 0,
            skewX: 0,
            skewY: 0,
            scaleX: 1,
            scaleY: 1
          }
        },
        styleJson: {
          fill: '#eab308',
          stroke: '#a16207',
          opacity: 0.7,
          zIndex: 10
        },
        metaJson: { quadra: 'A' }
      }
    });

    const lot3 = await this.prisma.mapElement.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        type: MapElementType.LOT,
        name: 'Quadra B - Lote 01',
        code: 'QB-L01',
        geometryType: GeometryType.POLYGON,
        geometryJson: {
          points: [
            { x: 400, y: 100 },
            { x: 500, y: 100 },
            { x: 500, y: 180 },
            { x: 400, y: 180 }
          ],
          transform: {
            x: 0,
            y: 0,
            rotation: 0,
            skewX: 0,
            skewY: 0,
            scaleX: 1,
            scaleY: 1
          }
        },
        styleJson: {
          fill: '#ef4444',
          stroke: '#b91c1c',
          opacity: 0.7,
          zIndex: 10
        },
        metaJson: { quadra: 'B' }
      }
    });

    // ─── Lot Details ─────────────────────────────────────
    await this.prisma.lotDetails.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        mapElementId: lot1.id,
        status: LotStatus.AVAILABLE,
        price: 120000,
        areaM2: 300,
        frontage: 12,
        depth: 25,
        slope: SlopeType.FLAT,
        conditionsJson: { entrada: '20%', parcelas: 120, juros: '0.99% a.m.' },
        notes: 'Lote de esquina com excelente localização.'
      }
    });

    await this.prisma.lotDetails.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        mapElementId: lot2.id,
        status: LotStatus.RESERVED,
        price: 110000,
        areaM2: 280,
        frontage: 10,
        depth: 28,
        slope: SlopeType.FLAT,
        conditionsJson: { entrada: '15%', parcelas: 120, juros: '0.99% a.m.' }
      }
    });

    await this.prisma.lotDetails.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        mapElementId: lot3.id,
        status: LotStatus.SOLD,
        price: 95000,
        areaM2: 250,
        frontage: 10,
        depth: 25,
        slope: SlopeType.UPHILL
      }
    });

    // ─── Road ────────────────────────────────────────────
    await this.prisma.mapElement.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        type: MapElementType.ROAD,
        name: 'Rua Principal',
        geometryType: GeometryType.POLYLINE,
        geometryJson: {
          points: [
            { x: 50, y: 200 },
            { x: 550, y: 200 }
          ],
          width: 30
        },
        styleJson: {
          fill: '#9ca3af',
          stroke: '#6b7280',
          opacity: 1,
          zIndex: 5
        },
        metaJson: { largura: '12m', sentido: 'duplo' }
      }
    });

    // ─── Roundabout ──────────────────────────────────────
    await this.prisma.mapElement.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        type: MapElementType.ROUNDABOUT,
        name: 'Rotatória Central',
        geometryType: GeometryType.CIRCLE,
        geometryJson: { cx: 300, cy: 300, r: 40 },
        styleJson: { fill: '#d1d5db', stroke: '#9ca3af', opacity: 1, zIndex: 5 }
      }
    });

    // ─── Green Area ──────────────────────────────────────
    await this.prisma.mapElement.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        type: MapElementType.GREEN,
        name: 'Área Verde Central',
        geometryType: GeometryType.POLYGON,
        geometryJson: {
          points: [
            { x: 250, y: 350 },
            { x: 350, y: 350 },
            { x: 350, y: 450 },
            { x: 250, y: 450 }
          ],
          transform: {
            x: 0,
            y: 0,
            rotation: 0,
            skewX: 0,
            skewY: 0,
            scaleX: 1,
            scaleY: 1
          }
        },
        styleJson: {
          fill: '#86efac',
          stroke: '#22c55e',
          opacity: 0.8,
          zIndex: 3
        }
      }
    });

    // ─── Lake ────────────────────────────────────────────
    await this.prisma.mapElement.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        type: MapElementType.LAKE,
        name: 'Lago Ornamental',
        geometryType: GeometryType.CIRCLE,
        geometryJson: { cx: 500, cy: 400, r: 60 },
        styleJson: {
          fill: '#7dd3fc',
          stroke: '#0ea5e9',
          opacity: 0.8,
          zIndex: 3
        }
      }
    });

    // ─── Leads ───────────────────────────────────────────
    await this.prisma.lead.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        mapElementId: lot1.id,
        name: 'Maria Silva',
        email: 'maria@email.com',
        phone: '(11) 99999-0001',
        message:
          'Tenho interesse no lote QA-L01. Podem me enviar mais informações?',
        source: 'site',
        status: LeadStatus.NEW
      }
    });

    await this.prisma.lead.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        mapElementId: lot2.id,
        name: 'João Santos',
        email: 'joao@email.com',
        phone: '(11) 99999-0002',
        message: 'Gostaria de agendar uma visita ao loteamento.',
        source: 'whatsapp',
        status: LeadStatus.CONTACTED,
        lastContactAt: new Date()
      }
    });

    // ─── Tenant 2 ────────────────────────────────────────
    const tenant2 = await this.prisma.tenant.create({
      data: {
        name: 'Loteadora Sol Nascente',
        slug: 'sol-nascente'
      }
    });

    await this.prisma.user.create({
      data: {
        tenantId: tenant2.id,
        name: 'Roberto Admin',
        email: 'admin@solnascente.com',
        passwordHash,
        role: UserRole.LOTEADORA
      }
    });

    await this.prisma.project.create({
      data: {
        tenantId: tenant2.id,
        name: 'Eco Ville',
        slug: 'eco-ville',
        description: 'Loteamento ecológico com 80 lotes.',
        status: ProjectStatus.DRAFT
      }
    });

    this.logger.log('📋 Test accounts created:');
    this.logger.log('   admin@sistema.com / admin123 (SYSADMIN)');
    this.logger.log('   admin@vistaverde.com / admin123 (LOTEADORA)');
    this.logger.log('   editor@vistaverde.com / admin123 (LOTEADORA)');
    this.logger.log('   admin@solnascente.com / admin123 (LOTEADORA)');
  }
}
