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

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  cnpj?: string | null;

  @ApiPropertyOptional({ example: 'Vista Verde Empreendimentos Ltda' })
  @IsOptional()
  @IsString()
  legalName?: string | null;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  stateRegistration?: string | null;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  municipalRegistration?: string | null;

  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @IsString()
  legalRepresentative?: string | null;

  @ApiPropertyOptional({ example: '(62) 98888-7777' })
  @IsOptional()
  @IsString()
  whatsapp?: string | null;

  @ApiPropertyOptional({ example: 'Fernanda Rocha' })
  @IsOptional()
  @IsString()
  contactName?: string | null;

  @ApiPropertyOptional({ example: 'comercial@empresa.com.br' })
  @IsOptional()
  @IsString()
  contactEmail?: string | null;

  @ApiPropertyOptional({ example: '(62) 3333-2222' })
  @IsOptional()
  @IsString()
  contactPhone?: string | null;

  @ApiPropertyOptional({ example: '74000-000' })
  @IsOptional()
  @IsString()
  addressZipCode?: string | null;

  @ApiPropertyOptional({ example: 'Av. Central' })
  @IsOptional()
  @IsString()
  addressStreet?: string | null;

  @ApiPropertyOptional({ example: '1000' })
  @IsOptional()
  @IsString()
  addressNumber?: string | null;

  @ApiPropertyOptional({ example: 'Sala 1201' })
  @IsOptional()
  @IsString()
  addressComplement?: string | null;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  addressDistrict?: string | null;

  @ApiPropertyOptional({ example: 'Goiania' })
  @IsOptional()
  @IsString()
  addressCity?: string | null;

  @ApiPropertyOptional({ example: 'GO' })
  @IsOptional()
  @IsString()
  addressState?: string | null;

  @ApiPropertyOptional({ example: 'Brasil' })
  @IsOptional()
  @IsString()
  addressCountry?: string | null;
}
