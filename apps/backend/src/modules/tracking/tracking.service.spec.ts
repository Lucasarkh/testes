import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { PrismaService } from '@infra/db/prisma.service';
import { NotificationsService } from '@modules/notifications/notifications.service';

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
    trackingVisitor: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    trackingEvent: {
      create: jest.fn(),
      findFirst: jest.fn()
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
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationsService,
          useValue: {
            onNewSession: jest.fn().mockResolvedValue(undefined)
          }
        }
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
      mockPrisma.trackingVisitor.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data })
      );
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
      expect(session.visitorId).toBe('v1');
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
        realtorLinkId: null,
        visitorId: 'v1'
      };
      const existingVisitor = {
        id: 'v1',
        ftUtmSource: 'google',
        ltUtmSource: 'google',
        lastSeenAt: new Date(),
        realtorLinkId: null
      };

      const dto = {
        sessionId: 's1',
        visitorId: 'v1',
        utmSource: 'facebook'
      };

      mockPrisma.trackingVisitor.findUnique.mockResolvedValue(existingVisitor);
      mockPrisma.trackingVisitor.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...existingVisitor, ...data })
      );
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
        visitorId: 'v1',
        realtorLinkId: 'r1',
        lastRealtorAt: thirtyDaysAgo,
        lastSeenAt: new Date()
      };
      const existingVisitor = {
        id: 'v1',
        realtorLinkId: 'r1',
        lastRealtorAt: thirtyDaysAgo,
        lastSeenAt: new Date()
      };

      mockPrisma.trackingVisitor.findUnique.mockResolvedValue(existingVisitor);
      mockPrisma.trackingVisitor.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...existingVisitor, ...data })
      );
      mockPrisma.trackingSession.findUnique.mockResolvedValue(existingSession);
      mockPrisma.trackingSession.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...existingSession, ...data })
      );

      const session = await service.createSession({ sessionId: 's1', visitorId: 'v1' } as any);

      expect(session.realtorLinkId).toBeNull(); // Cleared because > 30 days
    });

    it('should treat internal referrer as direct instead of referral', async () => {
      const dto = {
        projectSlug: 'test-project',
        referrer: 'https://www.lotio.com.br/test-project',
        landingPage: 'https://test-project.lotio.com.br/L-01'
      };

      const mockProject = {
        id: 'p1',
        tenantId: 't1',
        slug: 'test-project',
        customDomain: null,
        tenant: {
          id: 't1',
          slug: 'tenant-1',
          customDomain: null,
          isActive: true
        }
      };

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.trackingVisitor.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data })
      );
      mockPrisma.trackingSession.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 's1', ...data })
      );

      const session = await service.createSession(dto as any, '1.2.3.4', 'Mozilla/5.0');

      expect(session.ftUtmSource).toBe('Direto');
      expect(session.ltUtmSource).toBe('Direto');
      expect(session.ftReferrer).toBeNull();
      expect(session.ltReferrer).toBeNull();
      expect(session.referrer).toBeNull();
    });
  });

  describe('trackEvent', () => {
    it('should update session and visitor lastSeenAt when tracking an event', async () => {
      mockPrisma.trackingSession.findUnique.mockResolvedValue({
        id: 's1',
        lastSeenAt: new Date(),
        visitorId: 'v1'
      });
      mockPrisma.trackingVisitor.update.mockResolvedValue({ id: 'v1' });
      mockPrisma.trackingEvent.findFirst.mockResolvedValue(null);

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
      expect(mockPrisma.trackingVisitor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1' },
          data: { lastSeenAt: expect.any(Date) }
        })
      );
    });

    it('should reject expired sessions instead of extending them', async () => {
      const expiredAt = new Date(Date.now() - (31 * 60 * 1000));

      mockPrisma.trackingSession.findUnique.mockResolvedValue({
        id: 's1',
        lastSeenAt: expiredAt,
        visitorId: 'v1'
      });

      await expect(
        service.trackEvent({
          sessionId: 's1',
          type: 'PAGE_VIEW'
        } as any)
      ).rejects.toThrow('Tracking session expired');
    });
  });
});
