import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) { }

  async create(userId: number, dto: CreateScheduleDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    // 1. Validate cơ bản
    if (start >= end) {
      throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
    }

    // 2. CHECK TRÙNG LỊCH (Overlap Check)
    // Tìm xem trong DB có lịch nào của user này mà bị trùng với giờ mới không
    const existingSchedule = await this.prisma.workSchedule.findFirst({
      where: {
        userId: userId,
        // Logic check trùng:
        // (Lịch cũ bắt đầu trước khi Lịch mới kết thúc) VÀ (Lịch cũ kết thúc sau khi Lịch mới bắt đầu)
        AND: [
          { startTime: { lt: end } },  // Existing Start < New End
          { endTime: { gt: start } },  // Existing End > New Start
        ],
        // (Optional) Nếu muốn cho phép trùng khi lịch cũ đã bị REJECTED thì thêm dòng dưới:
        // status: { not: 'REJECTED' } 
      },
    });

    if (existingSchedule) {
      throw new BadRequestException(
        `Bạn đã có lịch đăng ký trong khoảng thời gian này rồi! (${existingSchedule.startTime.toISOString()} - ${existingSchedule.endTime.toISOString()})`
      );
    }

    // 3. Nếu không trùng -> Tạo mới
    return this.prisma.workSchedule.create({
      data: {
        userId,
        startTime: start,
        endTime: end,
        note: dto.note,
        status: 'PENDING',
      },
    });
  }

  // Lấy lịch (Giữ nguyên logic cũ, chỉ cần sort theo startTime)
  async findAll(userId: number) {
    return this.prisma.workSchedule.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' }
    });
  }
}