import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlantMapDto {
  @ApiPropertyOptional({ description: 'Nova URL da imagem da planta' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  imageWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  imageHeight?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 359 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(359)
  northAngleDeg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sunPathEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 359 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(359)
  sunPathAngleDeg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sunPathLabelEnabled?: boolean;
}
