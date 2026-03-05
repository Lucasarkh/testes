import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar usuário no tenant' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user: any
  ) {
    return this.userService.create(tenantId, dto, user);
  }

  @Get()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar usuários do tenant' })
  findAll(
    @TenantId() tenantId: string,
    @Query() pagination: PaginationQueryDto
  ) {
    return this.userService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.userService.findById(tenantId, id);
  }

  @Put(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar usuário' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.userService.update(tenantId, id, dto);
  }

  @Patch(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar usuário (parcial)' })
  patch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.userService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover usuário' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.userService.remove(tenantId, id);
  }
}
