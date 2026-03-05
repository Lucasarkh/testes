import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX
} from '@/common/security/password-policy';

export class CreateRealtorLinkDto {
  @ApiProperty({ example: 'João Corretor' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creci?: string;

  @ApiPropertyOptional({ description: 'URL da foto do corretor' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({
    example: 'joao-corretor',
    description: 'Código curto usado na URL (?c=CODIGO)'
  })
  @IsString()
  @MaxLength(64)
  code: string;

  @ApiPropertyOptional({
    description:
      'IDs dos projetos vinculados (vazio = válido para todos os projetos do tenant)',
    type: [String]
  })
  @IsOptional()
  @IsString({ each: true })
  projectIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Email para criar conta de acesso do corretor'
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email da conta inválido' })
  accountEmail?: string;

  @ApiPropertyOptional({
    description: 'Senha para criar conta de acesso do corretor'
  })
  @IsOptional()
  @IsString()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  accountPassword?: string;
}
