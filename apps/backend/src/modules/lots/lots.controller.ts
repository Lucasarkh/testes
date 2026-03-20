import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Put,
  Query,
  UploadedFile,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { LotsService } from './lots.service';
import { UpsertLotDetailsDto } from './dto/upsert-lot-details.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { LotsImportService } from './lots-import.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateLotCategoryDto } from './dto/create-lot-category.dto';
import { UpdateLotCategoryDto } from './dto/update-lot-category.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { join } from 'node:path';

@ApiTags('Lots')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('projects/:projectId/lots')
export class LotsController {
  constructor(
    private readonly lotsService: LotsService,
    private readonly lotsImportService: LotsImportService
  ) {}

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  findAll(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationQueryDto
  ) {
    return this.lotsService.findByProject(tenantId, projectId, pagination);
  }

  @Get('categories')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  listCategories(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.lotsService.listCategories(tenantId, projectId);
  }

  @Post('categories')
  @Roles('LOTEADORA', 'SYSADMIN')
  createCategory(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateLotCategoryDto,
  ) {
    return this.lotsService.createCategory(tenantId, projectId, dto);
  }

  @Put('categories/:categoryId')
  @Roles('LOTEADORA', 'SYSADMIN')
  updateCategory(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateLotCategoryDto,
  ) {
    return this.lotsService.updateCategory(tenantId, projectId, categoryId, dto);
  }

  @Delete('categories/:categoryId')
  @Roles('LOTEADORA', 'SYSADMIN')
  removeCategory(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.lotsService.removeCategory(tenantId, projectId, categoryId);
  }

  @Post('categories/:categoryId/image')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadCategoryImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('categoryId') categoryId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.lotsService.uploadCategoryImage(tenantId, projectId, categoryId, file);
  }

  @Delete('categories/:categoryId/image')
  @Roles('LOTEADORA', 'SYSADMIN')
  removeCategoryImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.lotsService.removeCategoryImage(tenantId, projectId, categoryId);
  }

  @Get(':mapElementId')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  findOne(
    @TenantId() tenantId: string,
    @Param('mapElementId') mapElementId: string
  ) {
    return this.lotsService.findByMapElement(tenantId, mapElementId);
  }

  @Put(':mapElementId')
  @Roles('LOTEADORA', 'SYSADMIN')
  upsert(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('mapElementId') mapElementId: string,
    @Body() dto: UpsertLotDetailsDto
  ) {
    return this.lotsService.upsert(tenantId, projectId, mapElementId, dto);
  }

  @Delete(':mapElementId')
  @Roles('LOTEADORA', 'SYSADMIN')
  remove(
    @TenantId() tenantId: string,
    @Param('mapElementId') mapElementId: string
  ) {
    return this.lotsService.remove(tenantId, mapElementId);
  }

  @Post('imports')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' }
      }
    }
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: join(process.cwd(), 'tmp', 'lot-imports'),
      limits: {
        fileSize: 25 * 1024 * 1024
      }
    })
  )
  async importCsv(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo CSV nao informado.');
    }

    const looksLikeCsv =
      file.mimetype.includes('csv') ||
      file.mimetype.includes('text/plain') ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (!looksLikeCsv) {
      throw new BadRequestException('Formato invalido. Envie um arquivo CSV.');
    }

    return this.lotsImportService.enqueueCsvImport({
      tenantId,
      projectId,
      createdById: user?.id,
      fileName: file.originalname,
      filePath: file.path
    });
  }

  @Get('imports/latest')
  @Roles('LOTEADORA', 'SYSADMIN')
  getLatestImport(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.lotsImportService.getLatestImport(tenantId, projectId);
  }

  @Get('imports/:importId')
  @Roles('LOTEADORA', 'SYSADMIN')
  getImportStatus(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('importId') importId: string
  ) {
    return this.lotsImportService.getImportStatus(
      tenantId,
      projectId,
      importId
    );
  }

  @Get('imports/:importId/errors')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getImportErrors(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('importId') importId: string,
    @Query('limit') limit?: string
  ) {
    return this.lotsImportService.getImportErrors(
      tenantId,
      projectId,
      importId,
      Number(limit) || 500
    );
  }
}
