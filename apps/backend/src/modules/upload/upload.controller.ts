import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('projects/:projectId')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // ── Project Banner ──────────────────────────────────────

  @Post('banner-image')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadBannerImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('device') device?: string,
  ) {
    return this.uploadService.uploadBannerImage(tenantId, projectId, file, device);
  }

  @Delete('banner-image')
  @Roles('LOTEADORA', 'SYSADMIN')
  removeBannerImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query('device') device?: string,
  ) {
    return this.uploadService.removeBannerImage(tenantId, projectId, device);
  }

  // ── Project footer logos (Realizacao e Propriedade) ───

  @Get('footer-logos')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  listFooterLogos(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.uploadService.listFooterLogos(tenantId, projectId);
  }

  @Post('footer-logos')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        label: { type: 'string' }
      }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFooterLogo(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('label') label?: string
  ) {
    return this.uploadService.uploadFooterLogo(tenantId, projectId, file, label);
  }

  @Delete('footer-logos/:logoId')
  @Roles('LOTEADORA', 'SYSADMIN')
  removeFooterLogo(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('logoId') logoId: string
  ) {
    return this.uploadService.removeFooterLogo(tenantId, projectId, logoId);
  }

  // ── Project media (gallery) ─────────────────────────────

  @Get('media')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  listMedia(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.uploadService.listMedia(tenantId, projectId);
  }

  @Post('media')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string' }
      }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('caption') caption?: string,
    @Query('lotDetailsId') lotDetailsId?: string
  ) {
    return this.uploadService.uploadMedia(
      tenantId,
      projectId,
      file,
      caption,
      lotDetailsId
    );
  }

  @Delete('media/:mediaId')
  @Roles('LOTEADORA', 'SYSADMIN')
  removeMedia(@TenantId() tenantId: string, @Param('mediaId') mediaId: string) {
    return this.uploadService.removeMedia(tenantId, mediaId);
  }

  // ── Presigned URL (for frontend-direct S3 upload) ───────

  @Get('presigned-upload')
  @Roles('LOTEADORA', 'SYSADMIN')
  getPresignedUrl(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query('folder') folder: string,
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string
  ) {
    return this.uploadService.getPresignedUploadUrl(
      tenantId,
      projectId,
      folder,
      fileName,
      contentType
    );
  }
}
