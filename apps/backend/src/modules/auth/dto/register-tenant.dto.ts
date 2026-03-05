import { IsEmail, IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX
} from '@/common/security/password-policy';

export class RegisterTenantDto {
  @ApiProperty({ example: 'Loteadora Vista Verde' })
  @IsString()
  @IsNotEmpty({ message: 'Nome da empresa é obrigatório' })
  tenantName: string;

  @ApiProperty({ example: 'vista-verde' })
  @IsString()
  @IsNotEmpty({ message: 'Slug é obrigatório' })
  tenantSlug: string;

  @ApiPropertyOptional({ example: 'vendas.vistaverde.com.br' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiPropertyOptional({ example: 'Vista Verde Empreendimentos Ltda' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  municipalRegistration?: string;

  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @IsString()
  legalRepresentative?: string;

  @ApiPropertyOptional({ example: 'CRECI-GO 12345 J' })
  @IsOptional()
  @IsString()
  creci?: string;

  @ApiPropertyOptional({ example: '(62) 99999-9999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '(62) 98888-7777' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'contato@vistaverde.com.br' })
  @IsOptional()
  @IsString()
  publicEmail?: string;

  @ApiPropertyOptional({ example: 'https://vistaverde.com.br' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 'Fernanda Rocha' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: 'comercial@vistaverde.com.br' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '(62) 3333-2222' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '74000-000' })
  @IsOptional()
  @IsString()
  addressZipCode?: string;

  @ApiPropertyOptional({ example: 'Av. Central' })
  @IsOptional()
  @IsString()
  addressStreet?: string;

  @ApiPropertyOptional({ example: '1000' })
  @IsOptional()
  @IsString()
  addressNumber?: string;

  @ApiPropertyOptional({ example: 'Sala 1201' })
  @IsOptional()
  @IsString()
  addressComplement?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  addressDistrict?: string;

  @ApiPropertyOptional({ example: 'Goiania' })
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional({ example: 'GO' })
  @IsOptional()
  @IsString()
  addressState?: string;

  @ApiPropertyOptional({ example: 'Brasil' })
  @IsOptional()
  @IsString()
  addressCountry?: string;

  @ApiProperty({ example: 'Carlos Admin' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({ example: 'admin@vistaverde.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({ example: 'senhaSegura123' })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password: string;
}
