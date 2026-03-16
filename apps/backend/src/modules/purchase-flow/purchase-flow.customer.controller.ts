import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PurchaseFlowService } from './purchase-flow.service';
import {
  CustomerConditionsConfirmationDto,
  CustomerDocumentRegistrationDto,
  CustomerDocumentUploadRequestDto,
  CustomerOtpRequestDto,
  CustomerOtpVerifyDto,
  CustomerProfileDto,
  CustomerSimulationDto,
  GenerateContractDto,
  ManualContractSignatureDto
} from './dto/purchase-flow.dto';

@ApiTags('Cliente - Purchase Flow')
@Controller('cliente')
export class PurchaseFlowCustomerController {
  constructor(private readonly service: PurchaseFlowService) {}

  @Post('otp/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  requestOtp(@Body() dto: CustomerOtpRequestDto) {
    return this.service.requestOtp(dto);
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async verifyOtp(
    @Body() dto: CustomerOtpVerifyDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.service.verifyOtp(dto);
    res.cookie(
      this.service.getAccessCookieName(),
      result.token,
      this.service.getAccessCookieOptions()
    );

    return {
      ok: true,
      expiresAt: result.expiresAt,
      reservation: result.reservation
    };
  }

  @Get('reserva-ativa')
  getActiveReservation(@Req() req: Request) {
    return this.service.getActiveReservationByAccessToken(
      req.cookies?.[this.service.getAccessCookieName()]
    );
  }

  @Get('processo-compra')
  getFlow(@Req() req: Request) {
    return this.service.getCustomerFlow(
      req.cookies?.[this.service.getAccessCookieName()]
    );
  }

  @Put('processo-compra/cadastro-cliente')
  updateCustomer(
    @Req() req: Request,
    @Body() dto: CustomerProfileDto
  ) {
    return this.service.updatePrimaryCustomer(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Put('processo-compra/cadastro-conjuge')
  updateSpouse(
    @Req() req: Request,
    @Body() dto: CustomerProfileDto
  ) {
    return this.service.updateSpouseCustomer(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/documentos/upload-url')
  getDocumentUploadUrl(
    @Req() req: Request,
    @Body() dto: CustomerDocumentUploadRequestDto
  ) {
    return this.service.getCustomerDocumentUploadUrl(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/documentos')
  registerDocument(
    @Req() req: Request,
    @Body() dto: CustomerDocumentRegistrationDto
  ) {
    return this.service.registerCustomerDocument(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/simulacao')
  approveSimulation(
    @Req() req: Request,
    @Body() dto: CustomerSimulationDto
  ) {
    return this.service.approveSimulation(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/confirmar-condicoes')
  confirmConditions(
    @Req() req: Request,
    @Body() dto: CustomerConditionsConfirmationDto
  ) {
    return this.service.confirmConditions(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/gerar-contrato')
  generateContract(
    @Req() req: Request,
    @Body() dto: GenerateContractDto
  ) {
    return this.service.generateContract(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/assinar-contrato')
  signContract(
    @Req() req: Request,
    @Body() dto: ManualContractSignatureDto
  ) {
    return this.service.signContract(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(
      this.service.getAccessCookieName(),
      this.service.getAccessCookieOptions()
    );
    return { ok: true };
  }
}