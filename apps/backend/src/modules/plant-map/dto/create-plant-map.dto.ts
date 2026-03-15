import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlantMapDto {
  @ApiProperty({ description: 'URL da imagem da planta' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  imageWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  imageHeight?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 359, default: 270 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(359)
  northAngleDeg?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sunPathEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 359, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(359)
  sunPathAngleDeg?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  sunPathLabelEnabled?: boolean;
}
