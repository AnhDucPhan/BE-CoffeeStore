import { Module } from '@nestjs/common';
import { SchedulesService } from './schedule.service';
import { ScheduleController } from './schedule.controller';

@Module({
  controllers: [ScheduleController],
  providers: [SchedulesService],
})
export class ScheduleModule {}
