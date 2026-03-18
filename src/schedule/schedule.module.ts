import { Module } from '@nestjs/common';
import { SchedulesService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { NotificationModule } from 'src/notification/notification.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ScheduleController],
  providers: [SchedulesService],
})
export class ScheduleModule {}
