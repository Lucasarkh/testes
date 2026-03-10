import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, ReservationFeeType } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Residencial Parque dos Ipês v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'parque-dos-ipes-v2' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Nova descrição do loteamento.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'http://example.com/map.png' })
  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: 'http://example.com/banner-tablet.png' })
  @IsOptional()
  @IsString()
  bannerImageTabletUrl?: string;

  @ApiPropertyOptional({ example: 'http://example.com/banner-mobile.png' })
  @IsOptional()
  @IsString()
  bannerImageMobileUrl?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: 'vendas.meu-loteamento.com.br' })
  @IsOptional()
  @IsString()
  customDomain?: string | null;

  @ApiPropertyOptional({ description: 'Dados do mapa do editor (JSON)' })
  @IsOptional()
  mapData?: any;

  @ApiPropertyOptional({
    description: 'Destaques/diferenciais do loteamento [{icon, label, value}]'
  })
  @IsOptional()
  highlightsJson?: any;

  @ApiPropertyOptional({ example: 'Sua família merece o melhor.' })
  @IsOptional()
  @IsString()
  highlightsTitle?: string;

  @ApiPropertyOptional({
    example:
      'Qualidade de vida, segurança e infraestrutura completa em um só lugar.'
  })
  @IsOptional()
  @IsString()
  highlightsSubtitle?: string;

  @ApiPropertyOptional({ example: 'Destaques' })
  @IsOptional()
  @IsString()
  traditionalHighlightsTitle?: string;

  @ApiPropertyOptional({
    example: 'Diferenciais pensados para o seu bem-estar.'
  })
  @IsOptional()
  @IsString()
  traditionalHighlightsSubtitle?: string;

  @ApiPropertyOptional({
    description: 'Exibe tabela de condições de pagamento nas páginas públicas'
  })
  @IsOptional()
  @IsBoolean()
  showPaymentConditions?: boolean;

  @ApiPropertyOptional({
    description: 'Valor inicial do investimento (ex: 144000)'
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startingPrice?: number;

  @ApiPropertyOptional({ description: 'Quantidade máxima de parcelas' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxInstallments?: number;

  @ApiPropertyOptional({
    description:
      'Resumo das condições de pagamento (ex: Entrada facilitada em 6x)'
  })
  @IsOptional()
  @IsString()
  paymentConditionsSummary?: string;

  @ApiPropertyOptional({
    description: 'Texto de localização e infraestrutura do entorno'
  })
  @IsOptional()
  @IsString()
  locationText?: string;

  @ApiPropertyOptional({ description: 'Endereço escrito do loteamento' })
  @IsOptional()
  @IsString()
  address?: string;
  @ApiPropertyOptional({ description: 'Habilita IA no empreendimento' })
  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @ApiPropertyOptional({ description: 'ID da configuração de IA' })
  @IsOptional()
  @IsString()
  aiConfigId?: string;
  @ApiPropertyOptional({ description: 'Link ou Embed URL do Google Maps' })
  @IsOptional()
  @IsString()
  googleMapsUrl?: string;

  @ApiPropertyOptional({
    description: 'URL do vídeo de apresentação no YouTube'
  })
  @IsOptional()
  @IsString()
  youtubeVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Tempo de expiração da reserva em horas',
    example: 24
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reservationExpiryHours?: number;

  @ApiPropertyOptional({
    description: 'Acompanhamento de status da obra [{label, percentage}]'
  })
  @IsOptional()
  constructionStatus?: any;

  @ApiPropertyOptional({ enum: ReservationFeeType })
  @IsOptional()
  @IsEnum(ReservationFeeType)
  reservationFeeType?: ReservationFeeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reservationFeeValue?: number;

  @ApiPropertyOptional({ description: 'Porcentagem de entrada mínima' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minDownPaymentPercent?: number;

  @ApiPropertyOptional({ description: 'Valor de entrada mínima fixa' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minDownPaymentValue?: number;

  @ApiPropertyOptional({ description: 'Taxa de juros mensal' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthlyInterestRate?: number;

  @ApiPropertyOptional({ description: 'Indexador de correção monetária' })
  @IsOptional()
  @IsString()
  indexer?: string;

  @ApiPropertyOptional({
    description: 'Permite parcelas intermediárias/balões'
  })
  @IsOptional()
  @IsBoolean()
  allowIntermediary?: boolean;

  @ApiPropertyOptional({ description: 'Disclaimer legal do financiamento' })
  @IsOptional()
  @IsString()
  financingDisclaimer?: string;

  @ApiPropertyOptional({
    description:
      'Informações legais / registros do loteamento exibidas na página pública'
  })
  @IsOptional()
  @IsString()
  legalNotice?: string;

  @ApiPropertyOptional({
    description:
      'Configuração de movimento do loteamento exibida na página pública'
  })
  @IsOptional()
  salesMotionConfig?: any;

  @ApiPropertyOptional({
    description: 'Ativar/desativar seção de proximidades'
  })
  @IsOptional()
  @IsBoolean()
  nearbyEnabled?: boolean;
}
