import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class BroadcastNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  /** If set, notify only users of this tenant */
  @IsOptional()
  @IsString()
  tenantId?: string;

  /** If set, notify only users with this role */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /** Also send an email to each target user */
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  /** Optional deep-link URL for the notification */
  @IsOptional()
  @IsString()
  actionUrl?: string;
}
