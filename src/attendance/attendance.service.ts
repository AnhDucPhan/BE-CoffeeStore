import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AttendanceService {
    constructor(private prisma: PrismaService) { }

    // 1. TÌM CA LÀM ĐANG DIỄN RA
    async getTodaySchedule(userId: number) {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

        // Chỉ lấy ca làm CHƯA CHECK-OUT
        const schedule = await this.prisma.workSchedule.findFirst({
            where: {
                userId: userId,
                status: 'APPROVED',
                attendanceStatus: { not: 'CHECKED_OUT' }, // 👈 Chốt chặn quan trọng
                startTime: { gte: todayStart, lte: todayEnd },
            },
            orderBy: { startTime: 'asc' }, 
        });

        return schedule;
    }

    // 2. CHECK-IN (Chỉ được 1 lần)
    async checkIn(userId: number, note?: string) {
        const schedule = await this.getTodaySchedule(userId);

        if (!schedule) {
            throw new NotFoundException('Hôm nay bạn không có ca làm việc nào, hoặc đã hoàn thành!');
        }

        // CHẶN NGHIÊM NGẶT: Chỉ khi NOT_STARTED mới được check-in
        if (schedule.attendanceStatus !== 'NOT_STARTED') {
            throw new BadRequestException('Bạn đã check-in cho ca làm này rồi! (Mỗi ca chỉ được check-in 1 lần)');
        }

        const now = new Date();
        const shiftStart = new Date(schedule.startTime);

        const diffMinutes = (now.getTime() - shiftStart.getTime()) / 60000;
        const isValid = (diffMinutes >= -60 && diffMinutes <= 5); // Trễ > 5p là vi phạm

        // CẬP NHẬT TRỰC TIẾP VÀO WORKSCHEDULE
        const updatedSchedule = await this.prisma.workSchedule.update({
            where: { id: schedule.id },
            data: {
                attendanceStatus: 'CHECKED_IN',
                actualCheckInTime: now,
                checkInNote: note,
                isAttendanceValid: isValid
            }
        });

        let message = 'Check-in thành công!';
        if (diffMinutes > 5) {
            message = `Check-in thành công! Bạn đến trễ ${Math.floor(diffMinutes)} phút.`;
        }

        return { success: true, message: message, data: updatedSchedule };
    }

    // 3. CHECK-OUT (Chỉ được 1 lần)
    async checkOut(userId: number, note?: string) {
        const schedule = await this.getTodaySchedule(userId);
        
        if (!schedule) throw new NotFoundException('Không tìm thấy ca làm hiện hành.');

        // CHẶN NGHIÊM NGẶT: Phải đang CHECKED_IN mới được check-out
        if (schedule.attendanceStatus !== 'CHECKED_IN') {
            throw new BadRequestException('Bạn chưa check-in hoặc đã check-out rồi!');
        }

        const now = new Date();
        const shiftEnd = new Date(schedule.endTime);

        let isValid = schedule.isAttendanceValid;
        const diffMinutes = (now.getTime() - shiftEnd.getTime()) / 60000;
        
        if (diffMinutes < -5 || diffMinutes > 30) {
            isValid = false; // Về sớm hoặc OT
        }

        // CẬP NHẬT TRỰC TIẾP VÀO WORKSCHEDULE
        const updatedSchedule = await this.prisma.workSchedule.update({
            where: { id: schedule.id },
            data: {
                attendanceStatus: 'CHECKED_OUT',
                actualCheckOutTime: now,
                checkOutNote: note,
                isAttendanceValid: isValid
            }
        });

        return { success: true, message: 'Check-out thành công! Cảm ơn bạn.', data: updatedSchedule };
    }
}