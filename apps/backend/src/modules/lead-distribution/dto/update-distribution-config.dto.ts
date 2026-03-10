import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDistributionConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
