import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { NotificationsService } from './notifications.service';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { SkipTermsCheck } from '@common/decorators/skip-terms-check.decorator';

@SkipTermsCheck()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.findAll(user.id, page, limit);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.countUnread(user.id);
    return { count };
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllAsRead(user.id);
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles('SYSADMIN')
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.broadcast(dto);
  }
}
