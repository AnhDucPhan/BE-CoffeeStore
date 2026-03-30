import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ApprovalStatus, Role } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) { }

    async create(creatorId: number, dto: CreateScheduleDto) {
      const creator = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { role: true }
      });

      if (!creator) {
        throw new BadRequestException('Người dùng không tồn tại!');
      }

      const targetUserId = creator.role === Role.STAFF ? creatorId : (dto.userId || creatorId);
      const finalStatus = creator.role === Role.MANAGER ? 'APPROVED' : 'PENDING';

      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);

      // CHỈ KIỂM TRA LUẬT NẾU LÀ STAFF
      if (creator.role === Role.STAFF) {
        if (!dto.settingId) {
          throw new BadRequestException('Thiếu mã đợt đăng ký ca làm!');
        }

        // 1. CHỈ CÓ DUY NHẤT 1 LẦN TÌM KIẾM BẰNG dto.settingId
        const setting = await this.prisma.scheduleSetting.findUnique({
          where: { id: dto.settingId }
        });

        // 2. KIỂM TRA ĐÓNG CỔNG BẰNG ĐÚNG CÁI SETTING VỪA TÌM
        if (!setting || !setting.isOpen) {
          throw new BadRequestException('Cổng đăng ký ca làm hiện đang ĐÓNG!');
        }

        // 3. KIỂM TRA QUÁ HẠN
        const now = new Date();
        if (setting.closeTime && now > setting.closeTime) {
          await this.prisma.scheduleSetting.update({
            where: { id: dto.settingId },
            data: { isOpen: false }
          });
          throw new BadRequestException('Đã quá thời hạn đăng ký ca làm!');
        }

        // 4. KIỂM TRA NGÀY HỢP LỆ
        if (setting.shiftStartDate && start < setting.shiftStartDate) {
          const startDateStr = setting.shiftStartDate.toLocaleDateString('vi-VN');
          throw new BadRequestException(`Bạn chỉ được đăng ký ca làm diễn ra từ ngày ${startDateStr} trở đi!`);
        }

        if (setting.shiftEndDate && end > setting.shiftEndDate) {
          const endDateStr = setting.shiftEndDate.toLocaleDateString('vi-VN');
          throw new BadRequestException(`Bạn chỉ được đăng ký ca làm diễn ra đến hết ngày ${endDateStr}!`);
        }
      }

      // KIỂM TRA TRÙNG GIỜ CA LÀM
      if (start >= end) {
        throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
      }

      const existingSchedule = await this.prisma.workSchedule.findFirst({
        where: {
          userId: targetUserId,
          AND: [
            { startTime: { lt: end } },
            { endTime: { gt: start } },
          ],
        },
      });

      if (existingSchedule) {
        throw new BadRequestException(
          creator.role === Role.STAFF
            ? `Bạn đã có ca làm trùng vào khoảng thời gian này!`
            : `Nhân viên này đã có ca làm trùng vào khoảng thời gian này!`
        );
      }

      // TẠO CA LÀM XUỐNG DB
      return this.prisma.workSchedule.create({
        data: {
          userId: targetUserId,
          startTime: start,
          endTime: end,
          note: dto.note,
          status: finalStatus,
          settingId: creator.role === Role.STAFF ? dto.settingId : null,
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
      include: {
        user: {
          select: { id: true, name: true, avatar: true, role: true } // Lấy đúng những gì FE cần cho nhẹ
        }
      }
    });
  }

  async publishSchedules(scheduleIds: number[], startDate: string, endDate: string) {
    if (!scheduleIds || scheduleIds.length === 0) {
      throw new BadRequestException('Không có ca làm nào để công bố!');
    }

    // 1. Lấy danh sách ID của các nhân viên có ca làm được công bố đợt này
    // (Để không gửi nhầm thông báo cho những người không liên quan)
    const targetUsers = await this.prisma.workSchedule.findMany({
      where: { id: { in: scheduleIds } },
      select: { userId: true },
      distinct: ['userId']
    });
    const userIds = targetUsers.map(u => u.userId);

    // 2. Chuyển trạng thái các ca mới thành Đã Công Bố (isPublished = true)
    await this.prisma.workSchedule.updateMany({
      where: {
        id: { in: scheduleIds },
        status: 'APPROVED',
        isPublished: false
      },
      data: { isPublished: true }
    });

    // 3. 👇 LOGIC MỚI: GOM TOÀN BỘ CA LÀM CỦA TUẦN 👇
    // Tìm tất cả các ca làm của những nhân viên trên, NẰM TRONG TUẦN ĐÓ, và ĐÃ ĐƯỢC CÔNG BỐ
    const fullPublishedSchedules = await this.prisma.workSchedule.findMany({
      where: {
        userId: { in: userIds },
        isPublished: true, // Lấy CẢ CŨ LẪN MỚI miễn là đã công bố
        startTime: { gte: new Date(startDate) },
        endTime: { lte: new Date(endDate) }
      },
      select: { id: true, userId: true, startTime: true, endTime: true }
    });

    // Trả về cái mảng khổng lồ này cho Notification Service tự động vẽ Bảng
    return fullPublishedSchedules;
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

        // 👇 ÉP KIỂU Ở ĐÂY BẰNG CHỮ "as ApprovalStatus" 👇
        ...(status && { status: status as ApprovalStatus }),

        ...(note !== undefined && { note }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
      },
      include: {
        user: true, // Join bảng User để lấy tên, avatar trả về cho Frontend hiển thị
      }
    });

    return updatedSchedule;
  }

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
  async createScheduleSetting(closeTime: Date, shiftStartDate: Date, shiftEndDate: Date) {
    // Chỉ thuần túy làm việc với Database bảng Setting
    const newSetting = await this.prisma.scheduleSetting.create({
      data: {
        isOpen: true,
        closeTime,
        shiftStartDate,
        shiftEndDate
      },
    });

    return newSetting; // Trả về cục setting vừa tạo
  }

  
}