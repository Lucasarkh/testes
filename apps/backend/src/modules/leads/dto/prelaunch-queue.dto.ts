import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PreLaunchQueueStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class PreLaunchQueueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por projeto' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por lote' })
  @IsOptional()
  @IsString()
  mapElementId?: string;

  @ApiPropertyOptional({ description: 'Buscar por lead, corretor, email ou lote' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PreLaunchQueueStatus })
  @IsOptional()
  @IsEnum(PreLaunchQueueStatus)
  status?: PreLaunchQueueStatus;
}

export class UpdatePreLaunchQueueDto {
  @ApiPropertyOptional({ enum: PreLaunchQueueStatus })
  @IsOptional()
  @IsEnum(PreLaunchQueueStatus)
  status?: PreLaunchQueueStatus;

  @ApiPropertyOptional({ description: 'Observações internas da fila' })
  @IsOptional()
  @IsString()
  notes?: string;
}