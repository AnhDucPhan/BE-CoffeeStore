import { Controller, Get, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('attendance') // 👈 Folder chuẩn chỉnh
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Get('today')
  async getTodaySchedule(@Request() req: any) {
    return this.attendanceService.getTodaySchedule(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-in')
  async checkIn(@Request() req: any, @Body('note') note?: string) {
    return this.attendanceService.checkIn(req.user.userId, note);
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-out')
  async checkOut(@Request() req: any,@Body('note') note?: string) {
    return this.attendanceService.checkOut(req.user.userId, note);
  }
}