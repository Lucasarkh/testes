import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import {
  DigitalSignatureProvider,
  PurchaseDocumentType,
  PurchasePartyRole
} from '@prisma/client';

export class PurchaseFieldRequirementDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsBoolean()
  required: boolean;
}

export class PurchaseDocumentRequirementDto {
  @IsEnum(PurchaseDocumentType)
  documentType: PurchaseDocumentType;

  @IsBoolean()
  required: boolean;
}

export class PurchasePaymentConditionDto {
  @IsNumber()
  @Type(() => Number)
  numberInstallments: number;

  @IsNumber()
  @Type(() => Number)
  entryAmount: number;

  @IsNumber()
  @Type(() => Number)
  installmentAmount: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalAmount?: number;
}

export class PurchasePaymentTableDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Type(() => Number)
  entryMinPercent: number;

  @IsNumber()
  @Type(() => Number)
  maxInstallments: number;

  @IsString()
  @IsNotEmpty()
  correctionIndex: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchasePaymentConditionDto)
  conditions: PurchasePaymentConditionDto[];
}

export class ContractTemplateDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  contentTemplate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePurchaseFlowConfigDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requireSpouseWhenMaritalStatus?: string[];

  @IsOptional()
  @IsEnum(DigitalSignatureProvider)
  signatureProvider?: DigitalSignatureProvider;

  @IsOptional()
  signatureProviderConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  autoGenerateContract?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseFieldRequirementDto)
  requiredFields?: PurchaseFieldRequirementDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseDocumentRequirementDto)
  requiredDocuments?: PurchaseDocumentRequirementDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchasePaymentTableDto)
  paymentTables?: PurchasePaymentTableDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractTemplateDto)
  contractTemplates?: ContractTemplateDto[];
}

export class CustomerOtpRequestDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CustomerOtpVerifyDto extends CustomerOtpRequestDto {
  @IsString()
  @IsNotEmpty()
  emailCode: string;

  @IsString()
  @IsNotEmpty()
  whatsappCode: string;
}

export class CustomerProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthlyIncome?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;

  @IsOptional()
  @IsString()
  addressState?: string;

  @IsOptional()
  @IsString()
  addressZip?: string;
}

export class CustomerDocumentUploadRequestDto {
  @IsEnum(PurchaseDocumentType)
  documentType: PurchaseDocumentType;

  @IsOptional()
  @IsEnum(PurchasePartyRole)
  role?: PurchasePartyRole;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;
}

export class CustomerDocumentRegistrationDto {
  @IsEnum(PurchaseDocumentType)
  documentType: PurchaseDocumentType;

  @IsOptional()
  @IsEnum(PurchasePartyRole)
  role?: PurchasePartyRole;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CustomerSimulationDto {
  @IsString()
  @IsNotEmpty()
  paymentTableId: string;

  @IsString()
  @IsNotEmpty()
  paymentConditionId: string;
}

export class CustomerConditionsConfirmationDto {
  @IsBoolean()
  accepted: boolean;
}

export class GenerateContractDto {
  @IsOptional()
  @IsString()
  templateId?: string;
}

export class ManualContractSignatureDto {
  @IsOptional()
  @IsString()
  signerName?: string;
}

export class PurchaseMetricsQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class PurchaseReservationsQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class ReservationActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateReservationAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsDateString()
  reservationExpiresAt?: string;
}

export class ConfirmSaleDto {
  @IsOptional()
  @IsString()
  notes?: string;
}