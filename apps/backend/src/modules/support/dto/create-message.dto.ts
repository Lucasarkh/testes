import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    description: 'Internal note visible only to SYSADMIN'
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
