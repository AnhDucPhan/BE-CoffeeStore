import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async getSchedulesForPayroll(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const now = new Date();

    const schedules = await this.prisma.workSchedule.findMany({
      where: {
        startTime: { gte: start, lte: end },
        endTime: { lte: now }, // 👈 CHỐT CHẶN: Chỉ lấy những ca ĐÃ KẾT THÚC tính đến hiện tại
        status: 'APPROVED', 
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { startTime: 'desc' }
    });

    return schedules.map(schedule => {
      let lateMinutes = 0;
      let otMinutes = 0;

      // 👇 BÂY GIỜ LẤY GIỜ TRỰC TIẾP TỪ CÁC CỘT CỦA BẢNG
      if (schedule.actualCheckInTime) {
        const diffIn = (schedule.actualCheckInTime.getTime() - schedule.startTime.getTime()) / 60000;
        if (diffIn > 5) lateMinutes = Math.floor(diffIn);
      }

      if (schedule.actualCheckOutTime) {
        const diffOut = (schedule.actualCheckOutTime.getTime() - schedule.endTime.getTime()) / 60000;
        if (diffOut > 30) otMinutes = Math.floor(diffOut); 
      }

      let systemFlag = schedule.payrollStatus; 
      if (systemFlag === 'UNCHECKED') {
        if (!schedule.actualCheckInTime || !schedule.actualCheckOutTime) {
          systemFlag = 'NEEDS_REVIEW'; // Thiếu giờ In/Out
        } else if (lateMinutes > 0 || otMinutes > 0 || !schedule.isAttendanceValid) {
          systemFlag = 'NEEDS_REVIEW'; // Có đi trễ/sớm
        } else {
          systemFlag = 'AUTO_APPROVED'; // Ngoan ngoãn
        }
      }

      return {
        id: schedule.id,
        employee: {
          name: schedule.user.name,
          code: `NV${schedule.user.id.toString().padStart(3, '0')}`,
          avatar: schedule.user.avatar || 'https://i.pravatar.cc/150',
        },
        shiftDate: schedule.startTime,
        planTime: `${schedule.startTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${schedule.endTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`,
        
        // 👇 HIỂN THỊ GIỜ THẬT RA GIAO DIỆN
        actualTime: {
          in: schedule.actualCheckInTime ? schedule.actualCheckInTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--',
          out: schedule.actualCheckOutTime ? schedule.actualCheckOutTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--',
        },
        lateMinutes,
        otMinutes,
        notes: {
          in: schedule.checkInNote || null,
          out: schedule.checkOutNote || null,
        },
        systemFlag,
        payrollStatus: schedule.payrollStatus 
      };
    });
  }

  // 2. SẾP CHỐT CÔNG (DUYỆT HOẶC TỪ CHỐI)
  async reviewPayroll(scheduleId: number, decision: 'APPROVE' | 'REJECT', standardMinutes: number, otMinutes: number) {
    const schedule = await this.prisma.workSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('Không tìm thấy ca làm này!');

    const newStatus = decision === 'APPROVE' ? 'MANUALLY_APPROVED' : 'REJECTED';

    const updated = await this.prisma.workSchedule.update({
      where: { id: scheduleId },
      data: {
        payrollStatus: newStatus,
        standardMinutes: standardMinutes, 
        otMinutes: otMinutes              
      }
    });

    return { 
      success: true, 
      message: decision === 'APPROVE' ? 'Đã chốt công thành công!' : 'Đã từ chối tính công!', 
      data: updated 
    };
  }
}