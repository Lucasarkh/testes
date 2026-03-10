import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Patch
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CreateAiConfigDto, UpdateAiConfigDto } from './dto/ai-config.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { TenantGuard } from '@common/guards/tenant.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Roles('LOTEADORA', 'SYSADMIN', 'IMOBILIARIA', 'CORRETOR')
  @ApiOperation({ summary: 'Interagir com a IA no painel autenticado' })
  chat(@TenantId() tenantId: string, @Body() dto: ChatDto) {
    return this.aiService.chat(dto, tenantId);
  }

  // --- Configuration Management ---
  @Get('configs')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar configurações de IA do tenant' })
  listConfigs(@TenantId() tenantId: string) {
    return this.aiService.listConfigs(tenantId);
  }

  @Post('configs')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar configuração de IA' })
  createConfig(@TenantId() tenantId: string, @Body() dto: CreateAiConfigDto) {
    return this.aiService.createConfig(tenantId, dto);
  }

  @Put('configs/:id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar configuração de IA' })
  updateConfig(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateAiConfigDto
  ) {
    return this.aiService.updateConfig(id, tenantId, dto);
  }

  @Delete('configs/:id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Excluir configuração de IA' })
  deleteConfig(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.aiService.deleteConfig(id, tenantId);
  }
}
