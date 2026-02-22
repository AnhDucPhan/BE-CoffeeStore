import { IsDateString, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateScheduleDto {
  // 👇 Thêm trường này: Không bắt buộc (Vì nếu user tự đăng ký thì không cần truyền)
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  note?: string;
}