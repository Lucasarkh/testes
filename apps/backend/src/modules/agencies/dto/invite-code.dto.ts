import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsDateString,
  IsBoolean,
  IsNotEmpty,
  IsEmail,
  Min,
  Matches
} from 'class-validator';
import { InviteCodeProjectAssignmentMode, UserRole } from '@prisma/client';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX
} from '@/common/security/password-policy';

export class CreateInviteCodeDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum([UserRole.CORRETOR, UserRole.IMOBILIARIA])
  @IsOptional()
  role?: UserRole;

  @IsEnum(InviteCodeProjectAssignmentMode)
  @IsOptional()
  projectAssignmentMode?: InviteCodeProjectAssignmentMode;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  projectIds?: string[];

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class RegisterWithInviteCodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  creci?: string;

  // For IMOBILIARIA role: agency name
  @IsString()
  @IsOptional()
  agencyName?: string;

  // For CORRETOR role: custom sharing link code
  @IsString()
  @IsOptional()
  sharingLinkCode?: string;
}

export class UpdateInviteCodeDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(InviteCodeProjectAssignmentMode)
  @IsOptional()
  projectAssignmentMode?: InviteCodeProjectAssignmentMode;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  projectIds?: string[];

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
