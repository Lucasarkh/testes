import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Residencial Parque dos Ipês' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({ example: 'parque-dos-ipes' })
  @IsString()
  @IsNotEmpty({ message: 'Slug é obrigatório' })
  slug: string;

  @ApiPropertyOptional({ example: 'Loteamento residencial com 120 lotes.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'vendas.meu-loteamento.com.br' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({
    example: 24,
    description: 'Tempo de expiração da reserva em horas'
  })
  @IsOptional()
  reservationExpiryHours?: number;

  @ApiPropertyOptional({
    description:
      'Configuração de movimento do loteamento exibida na página pública'
  })
  @IsOptional()
  salesMotionConfig?: any;
}
