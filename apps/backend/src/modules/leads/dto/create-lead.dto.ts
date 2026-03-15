import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '11999998888' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({
    description: 'ID do elemento do mapa (lote) de interesse'
  })
  @IsOptional()
  @IsString()
  mapElementId?: string;

  @ApiPropertyOptional({ example: 'Quero saber sobre condições de pagamento' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Código do corretor (parâmetro ?c= da URL pública)'
  })
  @IsOptional()
  @IsString()
  realtorCode?: string;

  @ApiPropertyOptional({ description: 'ID da sessão de tracking' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'ID persistente do visitante' })
  @IsOptional()
  @IsString()
  visitorId?: string;

  @ApiPropertyOptional({ description: 'JSON da conversa com o chatbot de IA' })
  @IsOptional()
  @IsString()
  aiChatTranscript?: string;
}
