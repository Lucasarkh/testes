import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectId?: string;
}
