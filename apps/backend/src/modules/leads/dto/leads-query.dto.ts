import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LeadStatus } from '@prisma/client';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class LeadsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by lead status',
    enum: LeadStatus
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by map element (lot) ID' })
  @IsOptional()
  @IsString()
  mapElementId?: string;

  @ApiPropertyOptional({ description: 'Filter by realtor link ID' })
  @IsOptional()
  @IsString()
  realtorLinkId?: string;
}
