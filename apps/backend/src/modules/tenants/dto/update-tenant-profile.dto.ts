import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantProfileDto {
  @ApiPropertyOptional({ example: 'CRECI-GO 12345 J' })
  @IsOptional()
  @IsString()
  creci?: string | null;

  @ApiPropertyOptional({ example: '(62) 99999-9999' })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ example: 'contato@empresa.com.br' })
  @IsOptional()
  @IsString()
  publicEmail?: string | null;

  @ApiPropertyOptional({ example: 'https://empresa.com.br' })
  @IsOptional()
  @IsString()
  website?: string | null;
}
