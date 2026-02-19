import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateScheduleDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string; // VD: "2023-10-25T08:00:00.000Z"

  @IsNotEmpty()
  @IsDateString()
  endTime: string;   // VD: "2023-10-25T12:00:00.000Z"

  @IsOptional() // Không bắt buộc (có thể để trống)
  @IsString()   // Phải là chuỗi
  note?: string;
}