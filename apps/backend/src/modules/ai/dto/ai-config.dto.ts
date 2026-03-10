import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateAiConfigDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAiConfigDto extends PartialType(CreateAiConfigDto) {}
