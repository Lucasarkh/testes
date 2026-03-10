import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { UserRole, TicketStatus } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(
    userId: string,
    tenantId: string | null,
    dto: CreateTicketDto
  ) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        tenantId: tenantId ?? null,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });
    return ticket;
  }

  async listTickets(
    userId: string,
    role: UserRole,
    page = 1,
    limit = 20,
    status?: TicketStatus
  ) {
    const skip = (page - 1) * limit;
    const where: any = role === UserRole.SYSADMIN ? {} : { userId };
    if (status) where.status = status;

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          _count: { select: { messages: true } }
        }
      }),
      this.prisma.supportTicket.count({ where })
    ]);

    return {
      data: tickets,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async getTicket(ticketId: string, userId: string, role: UserRole) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          where: role === UserRole.SYSADMIN ? {} : { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        }
      }
    });

    if (!ticket) throw new NotFoundException('Ticket não encontrado');

    // Non-admin users can only see their own tickets
    if (role !== UserRole.SYSADMIN && ticket.userId !== userId) {
      throw new ForbiddenException('Sem permissão para acessar este ticket');
    }

    return ticket;
  }

  async updateTicketStatus(
    ticketId: string,
    dto: UpdateTicketStatusDto,
    adminId: string
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Não é possível alterar um ticket fechado');
    }

    const resolvedAt =
      dto.status === TicketStatus.RESOLVED ? new Date() : ticket.resolvedAt;
    const closedAt =
      dto.status === TicketStatus.CLOSED ? new Date() : ticket.closedAt;

    const [updated] = await this.prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: dto.status, resolvedAt, closedAt },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        }
      });

      let message: any = null;
      if (dto.replyMessage?.trim()) {
        message = await tx.supportMessage.create({
          data: {
            ticketId,
            userId: adminId,
            message: dto.replyMessage.trim(),
            isInternal: false
          },
          include: { user: { select: { id: true, name: true, role: true } } }
        });
      }

      return [updatedTicket, message];
    });

    return updated;
  }

  async addMessage(
    ticketId: string,
    userId: string,
    role: UserRole,
    dto: CreateMessageDto
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        'Não é possível responder um ticket fechado'
      );
    }

    // Non-admin users can only reply to their own tickets
    if (role !== UserRole.SYSADMIN && ticket.userId !== userId) {
      throw new ForbiddenException('Sem permissão para responder este ticket');
    }

    // Only SYSADMIN can create internal notes
    const isInternal = role === UserRole.SYSADMIN && (dto.isInternal ?? false);

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        userId,
        message: dto.message,
        isInternal
      },
      include: {
        user: { select: { id: true, name: true, role: true } }
      }
    });

    // If user replies, move ticket back to IN_PROGRESS if it was WAITING_USER
    if (
      role !== UserRole.SYSADMIN &&
      ticket.status === TicketStatus.WAITING_USER
    ) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS }
      });
    }

    return message;
  }
}
