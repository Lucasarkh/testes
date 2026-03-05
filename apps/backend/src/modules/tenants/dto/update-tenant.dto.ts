import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Loteadora Vista Verde' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'vista-verde' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'vendas.vistaverde.com.br' })
  @IsOptional()
  @IsString()
  customDomain?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Public profile fields
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
