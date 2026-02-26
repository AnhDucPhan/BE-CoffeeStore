import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

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
  async findAll(startDate?: string, endDate?: string) {
    const whereCondition: any = {};

    if (startDate && endDate) {
      // 1. Mốc bắt đầu: 00:00:00 của ngày startDate
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // 2. Mốc kết thúc: 23:59:59 của ngày endDate
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // 3. Truy vấn các ca làm nằm trong tuần này
      whereCondition.startTime = {
        gte: start,
        lte: end,
      };
    }

    return this.prisma.workSchedule.findMany({
      where: whereCondition,
      orderBy: [
        {
          startTime: 'asc', 
        },
        {
          id: 'asc',        // Ưu tiên 2: Nếu có 2 ca trùng giờ bắt đầu, xếp theo ID (tạo trước xếp trước)
        }
      ], 
    });
  }

  async update(id: number, updateScheduleDto: UpdateScheduleDto) {
    // 1. Kiểm tra ca làm việc có tồn tại không
    const existingSchedule = await this.prisma.workSchedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      throw new NotFoundException(`Không tìm thấy ca làm việc với ID: ${id}`);
    }

    // Lấy các trường từ DTO
    const { startTime, endTime, userId, status, note } = updateScheduleDto;

    // 2. Lấy dữ liệu (Dùng cái mới truyền lên, nếu không có thì giữ nguyên cái cũ)
    const targetUserId = userId || existingSchedule.userId;
    const targetStartTime = startTime ? new Date(startTime) : existingSchedule.startTime;
    const targetEndTime = endTime ? new Date(endTime) : existingSchedule.endTime;

    // 3. Kiểm tra logic thời gian: Giờ kết thúc phải lớn hơn giờ bắt đầu
    if (targetStartTime >= targetEndTime) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu!');
    }

    // 4. KIỂM TRA TRÙNG LỊCH (Chỉ kiểm tra nếu có sửa đổi giờ giấc hoặc đổi người)
    if (startTime || endTime || userId) {
      const overlappingSchedule = await this.prisma.workSchedule.findFirst({
        where: {
          userId: targetUserId,
          id: { not: id }, // Loại trừ chính ca làm này ra khỏi vòng quét
          // Công thức vàng: (Bắt đầu A < Kết thúc B) VÀ (Kết thúc A > Bắt đầu B)
          startTime: { lt: targetEndTime },
          endTime: { gt: targetStartTime },
        },
      });

      if (overlappingSchedule) {
        throw new ConflictException('Nhân viên này đã có ca làm việc khác bị trùng vào khung giờ này!');
      }
    }

    // 5. Cập nhật vào Database
    const updatedSchedule = await this.prisma.workSchedule.update({
      where: { id },
      data: {
        ...(userId && { userId }),
        ...(status && { status }), // Có thể cập nhật luôn trạng thái PENDING/APPROVED
        ...(note !== undefined && { note }), // Dùng !== undefined để cho phép truyền chuỗi rỗng ""
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
      },
      include: {
        user: true, // Join bảng User để lấy tên, avatar trả về cho Frontend hiển thị
      }
    });

    return updatedSchedule;
  }

  // ===========================================
  // XÓA CA LÀM
  // ===========================================
  async remove(id: number) {
    // 1. Kiểm tra xem có tồn tại không
    const existingSchedule = await this.prisma.workSchedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      throw new NotFoundException(`Không tìm thấy ca làm việc với ID: ${id}`);
    }

    // 2. Thực hiện Xóa
    await this.prisma.workSchedule.delete({
      where: { id },
    });

    // 3. Trả về thông báo thành công
    return {
      success: true,
      message: 'Xóa ca làm việc thành công',
      deletedId: id
    };
  }

}