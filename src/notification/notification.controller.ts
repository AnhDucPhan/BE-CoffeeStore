import { Controller, Get, Post, Patch, Param, Req, UseGuards, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Nhớ bật Guard bảo vệ API

@Controller('notifications')
@UseGuards(JwtAuthGuard) // Nhớ uncomment dòng này để yêu cầu phải đăng nhập
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // 1. Quản lý bấm nút: Bắn thông báo cho toàn bộ Staff
  // Endpoint: POST http://localhost:8386/notifications/broadcast-open
  

  // 2. Lấy danh sách thông báo của người đang đăng nhập
  // Endpoint: GET http://localhost:8386/notifications/my-inbox
  @Get('my-inbox')
  async findMyInbox(@Req() req: any) {
    try {
      // 2. Tùy thuộc vào log ở trên, bạn có thể phải đổi .id thành .userId hoặc .sub
      const userId = Number(req.user?.id || req.user?.userId || req.user?.sub); 
      // Nếu ID bị NaN (không phải số), chặn lại ngay!
      if (!userId || isNaN(userId)) {
        throw new Error('Không trích xuất được ID hợp lệ từ Token!');
      }

      const notifications = await this.notificationService.getMyNotifications(userId);
      return notifications;

    } catch (error) {
      // 3. Ép nó phải in lỗi đỏ chót ra Terminal!
      console.error('🔥 LỖI THỰC SỰ ĐÂY RỒI:', error);
      throw error; 
    }
  }

  // 3. Đánh dấu đã đọc khi người dùng click vào thông báo
  // Endpoint: PATCH http://localhost:8386/notifications/5/read
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = Number(req.user.id);
    return this.notificationService.markAsRead(+id, userId);
  }

  @Get('schedule-settings')
  getSettings() {
    return this.notificationService.getScheduleSettings();
  }
}