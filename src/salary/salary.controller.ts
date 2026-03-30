import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { SalaryService } from './salary.service';
// import { JwtAuthGuard } from '...'; // Bật bảo mật lên nếu cần

@Controller('salary')
// @UseGuards(JwtAuthGuard)
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Get('monthly')
  async getMonthlySalary(@Query('month') month: string) {
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    return this.salaryService.calculateMonthlySalary(month);
  }

  @Post('pay')
  async paySalary(@Body() body: { userId: number, month: string }) {
    return this.salaryService.paySalary(body.userId, body.month);
  }
}