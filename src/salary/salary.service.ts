import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

const SALARY_MAP: Record<string, number> = {
  "Store Manager": 45000,
  "Shift Manager": 35000,
  "Senior Barista": 30000,
  "Barista": 25000,
};

@Injectable()
export class SalaryService {
  constructor(private prisma: PrismaService) {}

  // 1. TỔNG HỢP VÀ TÍNH TOÁN BẢNG LƯƠNG
  async calculateMonthlySalary(month: string) {
    const [year, monthStr] = month.split('-');
    const startOfMonth = new Date(Number(year), Number(monthStr) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(monthStr), 0, 23, 59, 59, 999);

    const schedules = await this.prisma.workSchedule.findMany({
      where: {
        startTime: { gte: startOfMonth, lte: endOfMonth },
        payrollStatus: { in: ['AUTO_APPROVED', 'MANUALLY_APPROVED'] }
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, position: true, hourlyRate: true } }
      }
    });

    const payrollMap = new Map();

    for (const schedule of schedules as any[]) {
      const userId = schedule.userId;
      const userPosition = schedule.user?.position || 'Barista';
      const currentHourlyRate = SALARY_MAP[userPosition] || schedule.user?.hourlyRate || 25000;

      if (!payrollMap.has(userId)) {
        payrollMap.set(userId, {
          userId: userId,
          employee: {
            name: schedule.user?.name || 'Không rõ',
            code: `NV${userId.toString().padStart(3, '0')}`,
            avatar: schedule.user?.avatar || 'https://i.pravatar.cc/150',
            position: userPosition,
          },
          totalShifts: 0,
          totalStandardMins: 0,
          totalOtMins: 0,
          hourlyRate: currentHourlyRate,
          isPaid: true,
        });
      }

      const record = payrollMap.get(userId);
      record.totalShifts += 1;
      record.totalStandardMins += schedule.standardMinutes || 0;
      record.totalOtMins += schedule.otMinutes || 0;
      
      if (!schedule.isPaid) {
        record.isPaid = false; 
      }
    }

    // 👇 CHUYỂN LOGIC TÍNH TIỀN VỀ ĐÂY
    const finalPayroll = Array.from(payrollMap.values()).map(record => {
      // Gom chung phút hành chính và tăng ca
      const totalMinutes = record.totalStandardMins + record.totalOtMins;
      
      // Quy đổi ra giờ
      const totalHours = totalMinutes / 60;
      
      // Tính ra thành tiền
      const totalSalary = totalHours * record.hourlyRate;

      return {
        ...record,
        totalHours, // Gửi luôn biến này cho FE
        totalSalary // Gửi luôn tổng tiền cho FE
      };
    });

    return finalPayroll;
  }

  // 2. THANH TOÁN LƯƠNG
  async paySalary(userId: number, month: string) {
    const [year, monthStr] = month.split('-');
    const startOfMonth = new Date(Number(year), Number(monthStr) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(monthStr), 0, 23, 59, 59, 999);

    const updated = await this.prisma.workSchedule.updateMany({
      where: {
        userId: userId,
        startTime: { gte: startOfMonth, lte: endOfMonth },
        payrollStatus: { in: ['AUTO_APPROVED', 'MANUALLY_APPROVED'] },
        isPaid: false
      },
      data: { isPaid: true }
    });
    if (updated.count === 0) {
      throw new BadRequestException('Không tìm thấy ca làm nào cần thanh toán!');
    }

    return { success: true, message: `Đã thanh toán thành công ${updated.count} ca làm!` };
  }
}