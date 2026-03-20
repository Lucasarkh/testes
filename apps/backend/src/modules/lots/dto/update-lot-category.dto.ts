import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLotCategoryDto {
  @ApiPropertyOptional({ example: 'Premium' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Lotes com atributos mais valorizados do empreendimento.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}