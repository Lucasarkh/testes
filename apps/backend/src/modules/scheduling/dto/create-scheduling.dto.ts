import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSchedulingDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  leadId?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  // For public bookings, we might pass lead data
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  leadName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  leadEmail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  leadPhone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  realtorCode?: string;
}
