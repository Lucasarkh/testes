import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
