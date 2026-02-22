import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
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
  findAll(@Request() req) {
    const userId = req.user.userId;
    return this.schedulesService.findAll(userId);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.schedulesService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto) {
  //   return this.schedulesService.update(+id, updateScheduleDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.schedulesService.remove(+id);
  // }
}
