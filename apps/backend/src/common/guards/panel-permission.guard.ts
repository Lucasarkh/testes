import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '@/infra/db/prisma.service';
import {
  hasPanelFeatureAccess,
  normalizePanelPermissions,
  resolvePanelFeatureFromPath
} from '@/common/permissions/panel-permissions';

@Injectable()
export class PanelPermissionGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) return true;

    const token = authHeader.split(' ')[1];
    if (!token) return true;

    let payload: any;
    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      payload = jwt.verify(token, secret);
    } catch {
      return true;
    }

    const userId = payload?.sub;
    if (!userId) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        tenantId: true,
        panelPermissions: true
      }
    });

    if (!user || user.role === 'SYSADMIN' || !user.tenantId) return true;
    if (user.role !== 'LOTEADORA' || !user.panelPermissions) return true;

    const feature = resolvePanelFeatureFromPath(request.path || request.originalUrl || '/');
    if (!feature) return true;

    const requiredAccess = ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
      ? 'read'
      : 'write';

    const permissions = normalizePanelPermissions(user.panelPermissions);
    if (!hasPanelFeatureAccess(permissions, feature, requiredAccess)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Você não tem permissão para acessar esta funcionalidade.',
        code: 'FEATURE_ACCESS_DENIED',
        feature,
        requiredAccess
      });
    }

    return true;
  }
}