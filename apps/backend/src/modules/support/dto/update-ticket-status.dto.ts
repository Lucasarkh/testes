import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @ApiPropertyOptional({
    description: 'Optional reply message when changing status'
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  replyMessage?: string;
}
