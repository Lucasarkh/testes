import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Patch,
  Request,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantsService } from './tenants.service';
import { RegisterTenantDto } from '../auth/dto/register-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Tenants (System Admin)')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SYSADMIN')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma nova loteadora (tenant + adm)' })
  create(@Body() dto: RegisterTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as loteadoras com métricas' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('me')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Retorna perfil público da loteadora autenticada' })
  findMe(@Request() req: any) {
    return this.tenantsService.findSelf(req.user.tenantId);
  }

  @Patch('me/profile')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar dados de perfil público da loteadora' })
  updateProfile(@Request() req: any, @Body() dto: UpdateTenantProfileDto) {
    const tenantId = req.user.tenantId;
    return this.tenantsService.updateProfile(tenantId, dto);
  }

  @Post('me/logos')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Upload de logo da loteadora' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.tenantsService.uploadLogo(req.user.tenantId, file);
  }

  @Delete('me/logos/:logoId')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover logo da loteadora' })
  deleteLogo(@Request() req: any, @Param('logoId') logoId: string) {
    return this.tenantsService.deleteLogo(req.user.tenantId, logoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados da loteadora' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativar/Desativar loteadora' })
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.tenantsService.updateStatus(id, isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover loteadora' })
  remove(@Param('id') id: string) {
    return this.tenantsService.delete(id);
  }
}
