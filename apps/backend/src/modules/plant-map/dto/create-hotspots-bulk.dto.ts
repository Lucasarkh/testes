import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateHotspotDto } from './create-hotspot.dto';

export class CreateHotspotsBulkDto {
  @ApiProperty({ type: [CreateHotspotDto], description: 'Lista de hotspots a criar (máx 500)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateHotspotDto)
  hotspots: CreateHotspotDto[];
}
