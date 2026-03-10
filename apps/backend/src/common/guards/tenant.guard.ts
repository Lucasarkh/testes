import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * TenantGuard ensures that the authenticated user's tenantId
 * is injected into the request and that tenant isolation is enforced.
 * Must be used AFTER AuthGuard('jwt').
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    if (user.role === UserRole.SYSADMIN) {
      // Sysadmins can access any tenant but might need to specify one
      // in query params or headers if needed. For global actions, no tenantId.
      request.tenantId =
        request.query.tenantId || request.headers['x-tenant-id'];
      return true;
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Usuário não associado a um tenant.');
    }

    // Inject tenantId into the request for easy access
    request.tenantId = user.tenantId;

    return true;
  }
}
