import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedule.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly schedulesService: SchedulesService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() dto: CreateScheduleDto) {

    const targetUserId = dto.userId ? dto.userId : req.user.userId;

    return this.schedulesService.create(targetUserId, dto);
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
}
