import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '@/infra/db/prisma.service';
import { SKIP_TERMS_CHECK_KEY } from '../decorators/skip-terms-check.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TermsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if endpoint is marked public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    // Skip if endpoint explicitly opts out of terms check
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_TERMS_CHECK_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;

    // No auth header → not authenticated, let AuthGuard handle it
    if (!authHeader?.startsWith('Bearer ')) return true;

    const token = authHeader.split(' ')[1];
    if (!token) return true;

    let payload: any;
    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      payload = jwt.verify(token, secret);
    } catch {
      // Invalid/expired token → let AuthGuard handle and reject properly
      return true;
    }

    const userId = payload?.sub;
    if (!userId) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { termsAcceptedAt: true }
    });

    if (!user?.termsAcceptedAt) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.',
        code: 'TERMS_NOT_ACCEPTED'
      });
    }

    return true;
  }
}
