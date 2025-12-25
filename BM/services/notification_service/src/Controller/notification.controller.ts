// src/notification.controller.ts
import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from '../Service/notification.service';
import {GatewayAuthGuard} from '../gateway-auth.guard';

@Controller('api')
export class NotificationController {
  constructor(private readonly notiService: NotificationService) {}

  // GET /notifications/:userId
  // Lấy danh sách
  @Get()
  @UseGuards(GatewayAuthGuard)
  async getUserNotifications(@Req() req: any,) {
    const userId = req.user?.userId;
    return this.notiService.getNotifications(userId);
  }

  // GET /notifications/unread/:userId
  // Lấy số lượng chưa đọc
  @Get('unread')
  @UseGuards(GatewayAuthGuard)
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.userId;
    return this.notiService.countUnread(userId);
  }

  // PATCH /notifications/read/:userId
  // Đánh dấu tất cả là đã đọc
  @Patch('read')
  @UseGuards(GatewayAuthGuard)
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.userId;
    return this.notiService.markAsRead(userId);
  }
}