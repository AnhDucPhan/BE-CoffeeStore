import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Sửa đường dẫn nếu cần

@Controller('payroll')
@UseGuards(JwtAuthGuard) // Sau này bạn có thể thêm @UseGuards(RolesGuard) để chặn nhân viên gọi API này
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // API: Lấy danh sách để duyệt (Ví dụ gọi: GET /payroll?startDate=2026-03-16&endDate=2026-03-22)
  @Get()
  async getPayrollSchedules(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.payrollService.getSchedulesForPayroll(startDate, endDate);
  }

  // API: Bấm nút Duyệt/Từ chối 1 ca làm
  @Patch(':id/review')
  async reviewPayroll(
    @Param('id') id: string,
    @Body('decision') decision: 'APPROVE' | 'REJECT',
    @Body('standardMinutes') standardMinutes: number,
    @Body('otMinutes') otMinutes: number,
  ) {
    return this.payrollService.reviewPayroll(+id, decision, standardMinutes, otMinutes);
  }
}