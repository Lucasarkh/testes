import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserRole, TicketStatus } from '@prisma/client';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir novo ticket de suporte' })
  async createTicket(@Request() req: any, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(
      req.user.id,
      req.user.tenantId ?? null,
      dto
    );
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Listar tickets (próprios ou todos para SYSADMIN)' })
  async listTickets(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    const ticketStatus =
      status && Object.values(TicketStatus).includes(status as TicketStatus)
        ? (status as TicketStatus)
        : undefined;
    return this.supportService.listTickets(
      req.user.id,
      req.user.role as UserRole,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      ticketStatus
    );
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Detalhes de um ticket com mensagens' })
  async getTicket(@Param('id') id: string, @Request() req: any) {
    return this.supportService.getTicket(
      id,
      req.user.id,
      req.user.role as UserRole
    );
  }

  @Patch('tickets/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar status do ticket (apenas SYSADMIN)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @Request() req: any
  ) {
    if (req.user.role !== UserRole.SYSADMIN) {
      throw new ForbiddenException(
        'Apenas administradores podem alterar o status do ticket'
      );
    }
    return this.supportService.updateTicketStatus(id, dto, req.user.id);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar mensagem a um ticket' })
  async addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @Request() req: any
  ) {
    return this.supportService.addMessage(
      id,
      req.user.id,
      req.user.role as UserRole,
      dto
    );
  }
}
