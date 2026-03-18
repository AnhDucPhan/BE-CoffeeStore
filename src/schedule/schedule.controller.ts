import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedule.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NotificationService } from 'src/notification/notification.service';

@Controller('schedule')
export class ScheduleController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly notificationService: NotificationService,) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: CreateScheduleDto) {
    const creatorId = req.user.userId;
    return this.schedulesService.create(creatorId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.schedulesService.findAll(startDate, endDate);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.schedulesService.findOne(+id);
  // }

 @Patch('publish')
  async publishSchedules(
    @Body('scheduleIds') scheduleIds: number[],
    @Body('startDate') startDate: string, // Lấy thêm startDate
    @Body('endDate') endDate: string      // Lấy thêm endDate
  ) {
    // Truyền sang service
    const publishedSchedules = await this.schedulesService.publishSchedules(scheduleIds, startDate, endDate);
    
    await this.notificationService.notifyStaffPublishedSchedules(publishedSchedules);
    return { success: true, message: `Đã công bố thành công!` };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number, // Dùng ParseIntPipe để đảm bảo id là số
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.remove(id);
  }

  @Post('open-setting')
  async openScheduleSetting(
    @Body('closeTime') closeTime: string,
    @Body('shiftStartDate') shiftStartDate: string,
    @Body('shiftEndDate') shiftEndDate: string,
  ) {
    // 1. Tay trái: Lệnh cho ScheduleService tạo cài đặt dưới Database
    const newSetting = await this.schedulesService.createScheduleSetting(
      new Date(closeTime),
      new Date(shiftStartDate),
      new Date(shiftEndDate)
    );

    // 2. Tay phải: Lấy kết quả vừa tạo, ném cho NotificationService đi báo cáo
    await this.notificationService.notifyStaffOpenSchedule(newSetting);

    // 3. Báo cáo hoàn thành về cho Frontend
    return {
      success: true,
      message: "Đã thiết lập thời gian và mở cổng đăng ký ca làm thành công!"
    };
  }

  
}
