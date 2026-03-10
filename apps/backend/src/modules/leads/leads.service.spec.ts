import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '@infra/db/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  const mockPrisma = {
    project: {
      findUnique: jest.fn()
    },
    lead: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    trackingSession: {
      findUnique: jest.fn()
    },
    realtorLink: {
      findFirst: jest.fn()
    },
    leadHistory: {
      create: jest.fn()
    },
    mapElement: {
      findFirst: jest.fn()
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrisma }
      ]
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createPublic', () => {
    it('should attach session attribution and deduplicate lead', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '11999999999',
        sessionId: 's1'
      };

      const mockProject = { id: 'p1', tenantId: 't1', status: 'PUBLISHED' };
      const mockSession = {
        id: 's1',
        ftUtmSource: 'google',
        ltUtmSource: 'facebook',
        realtorLinkId: 'r1'
      };

      const mockExistingLead = {
        id: 'l_old',
        phone: '11999999999',
        createdAt: new Date()
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.trackingSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.lead.findFirst.mockResolvedValue(mockExistingLead); // Found recent lead
      mockPrisma.lead.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data })
      );

      const lead = await service.createPublic('proj-slug', dto as any);

      expect(lead.isRecurrent).toBe(true);
      expect(lead.ftUtmSource).toBe('google');
      expect(lead.ltUtmSource).toBe('facebook');
      expect(lead.realtorLinkId).toBe('r1');
      expect(mockPrisma.leadHistory.create).toHaveBeenCalled();
    });
  });
});
