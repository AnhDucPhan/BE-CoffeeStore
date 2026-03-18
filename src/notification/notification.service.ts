import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationGateway
  ) { }
  // Trong notification.service.ts
  async notifyStaffOpenSchedule(setting: any) {
    // Chỉ thuần túy làm việc với User, Notification và Socket
    const staffs = await this.prisma.user.findMany({ where: { role: 'STAFF' }, select: { id: true } });

    if (staffs.length > 0) {
      const payloadData = JSON.stringify({
        settingId: setting.id,
        closeTime: setting.closeTime.toISOString(),
        shiftStartDate: setting.shiftStartDate.toISOString(),
        shiftEndDate: setting.shiftEndDate.toISOString(),
      });

      const notifications = staffs.map((staff) => ({
        userId: staff.id,
        title: '🔔 ĐÃ MỞ CỔNG ĐĂNG KÝ CA LÀM!',
        message: payloadData,
        type: 'SCHEDULE_OPEN',
      }));

      await this.prisma.notification.createMany({ data: notifications });
      this.gateway.sendNotificationToAll('newNotification', { message: 'Quản lý vừa mở cổng đăng ký ca làm!' });
    }
  }

  // 2. API Lấy hòm thư của riêng 1 User
  async getMyNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // Sắp xếp tin mới nhất lên đầu
    });
  }

  // 3. API Đánh dấu 1 tin là đã đọc
  async markAsRead(id: number, userId: number) {
    // Dùng updateMany để tránh lỗi Prisma nếu id không tồn tại, 
    // và đảm bảo chỉ update đúng thư của user đó (bảo mật)
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    return { success: true };
  }

  async getScheduleSettings() {
    return this.prisma.scheduleSetting.findUnique({ where: { id: 1 } });
  }

  async notifyStaffPublishedSchedules(publishedSchedules: any[]) {
    if (!publishedSchedules || publishedSchedules.length === 0) return;

    // 1. Gom nhóm các ca làm theo từng nhân viên
    const userSchedules = new Map<number, any[]>();
    for (const sched of publishedSchedules) {
      if (!userSchedules.has(sched.userId)) {
        userSchedules.set(sched.userId, []);
      }
      userSchedules.get(sched.userId).push(sched);
    }

    const notifications = [];

    // Các hàm phụ trợ format thời gian chuẩn Việt Nam
    const getWeekdayVN = (date: Date) => {
      const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return days[date.getDay()];
    };
    
    const formatDate = (date: Date) => 
      `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    
    const formatTime = (date: Date) => 
      `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    // 2. Duyệt qua từng nhân viên
    for (const [userId, schedules] of userSchedules.entries()) {
      // Sắp xếp tăng dần theo thời gian
      schedules.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      const firstDay = new Date(schedules[0].startTime);
      const lastDay = new Date(schedules[schedules.length - 1].startTime);

      // Tạo chuỗi ngày cho Tiêu đề: "16/03 - 22/03"
      const shortFirstDay = `${firstDay.getDate().toString().padStart(2, '0')}/${(firstDay.getMonth() + 1).toString().padStart(2, '0')}`;
      const shortLastDay = `${lastDay.getDate().toString().padStart(2, '0')}/${(lastDay.getMonth() + 1).toString().padStart(2, '0')}`;
      const weekRangeString = shortFirstDay === shortLastDay ? shortFirstDay : `${shortFirstDay} đến ${shortLastDay}`;

      // TẠO MẢNG DỮ LIỆU ĐỂ VẼ BẢNG Ở FRONTEND
      const shiftDetails = schedules.map(s => ({
        dateStr: `${getWeekdayVN(new Date(s.startTime))}, ${formatDate(new Date(s.startTime))}`, // VD: "Thứ 2, 16/03/2026"
        timeStr: `${formatTime(new Date(s.startTime))} - ${formatTime(new Date(s.endTime))}` // VD: "08:00 - 12:00"
      }));

      // Đóng gói JSON
      notifications.push({
        userId: userId,
        title: `Quản lí vừa cập nhật ca làm cho tuần từ ${weekRangeString}`, // 👈 Yêu cầu của bạn ở đây
        message: JSON.stringify({
          displayType: 'TABLE', // Báo cho FE biết đây là thông báo dạng bảng
          introText: `Bạn có ${schedules.length} ca làm việc được phân công trong tuần này. Vui lòng kiểm tra chi tiết bên dưới:`,
          shifts: shiftDetails // Truyền nguyên cái mảng này xuống FE
        }),
        type: 'SCHEDULE_PUBLISHED', 
      });
    }

    // 3. Lưu Database
    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
      this.gateway.sendNotificationToAll('newNotification', { 
        message: 'Quản lý vừa cập nhật lịch làm việc mới cho bạn!' 
      });
    }
  }
}
