import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'], {
    message: 'Trạng thái chỉ được phép là PENDING, APPROVED hoặc REJECTED',
  })
  status?: string;

  // Cấu trúc ngầm định của class này hiện tại sẽ bao gồm:
  // userId?: number;
  // startTime?: string | Date;
  // endTime?: string | Date;
  // note?: string;
  // status?: string; (Vừa được thêm vào ở trên)
}