import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('Public – AI')
@Controller('p/:projectSlug/ai')
export class PublicAiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Throttle({ default: { limit: 18, ttl: 60000 } })
  @ApiOperation({ summary: 'Chat público com a IA do projeto' })
  chat(@Param('projectSlug') projectSlug: string, @Body() dto: ChatDto) {
    return this.aiService.chatPublic(projectSlug, dto);
  }
}
