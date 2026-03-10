import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { PrismaService } from '@infra/db/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('TrackingService', () => {
  let service: TrackingService;
  let prisma: PrismaService;

  const mockPrisma = {
    project: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    trackingSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    trackingEvent: {
      create: jest.fn()
    },
    realtorLink: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    tenant: {
      findUnique: jest.fn()
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: mockPrisma }
      ]
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session if none exists', async () => {
      const dto = {
        projectSlug: 'test-project',
        utmSource: 'google',
        utmMedium: 'cpc',
        landingPage: 'https://test.com/landing'
      };

      const mockProject = { id: 'p1', tenantId: 't1', slug: 'test-project' };
      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.trackingSession.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 's1', ...data })
      );

      const session = await service.createSession(
        dto as any,
        '1.2.3.4',
        'Mozilla/5.0'
      );

      expect(session.id).toBe('s1');
      expect(session.ftUtmSource).toBe('google');
      expect(session.ltUtmSource).toBe('google');
      expect(session.landingPage).toBe(dto.landingPage);
      expect(session.deviceType).toBe('desktop');
    });

    it('should update last-touch if session exists and UTMs change', async () => {
      const existingSession = {
        id: 's1',
        ftUtmSource: 'google',
        ltUtmSource: 'google',
        lastSeenAt: new Date(),
        realtorLinkId: null
      };

      const dto = {
        sessionId: 's1',
        utmSource: 'facebook'
      };

      mockPrisma.trackingSession.findUnique.mockResolvedValue(existingSession);
      mockPrisma.trackingSession.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...existingSession, ...data })
      );

      const session = await service.createSession(dto as any);

      expect(session.ftUtmSource).toBe('google'); // Remains same
      expect(session.ltUtmSource).toBe('facebook'); // Updated
    });

    it('should handle realtor attribution with 30-day window', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31);

      const existingSession = {
        id: 's1',
        realtorLinkId: 'r1',
        lastRealtorAt: thirtyDaysAgo,
        lastSeenAt: new Date()
      };

      mockPrisma.trackingSession.findUnique.mockResolvedValue(existingSession);
      mockPrisma.trackingSession.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...existingSession, ...data })
      );

      const session = await service.createSession({ sessionId: 's1' } as any);

      expect(session.realtorLinkId).toBeNull(); // Cleared because > 30 days
    });
  });

  describe('trackEvent', () => {
    it('should update lastSeenAt when tracking an event', async () => {
      mockPrisma.trackingSession.findUnique.mockResolvedValue({
        id: 's1',
        lastSeenAt: new Date()
      });

      await service.trackEvent({
        sessionId: 's1',
        type: 'PAGE_VIEW'
      } as any);

      expect(mockPrisma.trackingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: { lastSeenAt: expect.any(Date) }
        })
      );
    });
  });
});
