import { IsOptional, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterProductDto {
  @IsOptional()
  @Type(() => Number) // Tự động ép kiểu chuỗi '1' thành số 1
  @IsNumber()
  @Min(1)
  page?: number; // Mặc định là trang 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  items_per_page?: number = 9; // Mặc định lấy 10 cái

  @IsOptional()
  @IsString()
  search?: string; // Để tìm kiếm theo tên

  @IsOptional()
  @IsIn(['asc', 'desc']) 
  sort?: 'asc' | 'desc';

  @IsOptional()
  @IsIn(['createdAt', 'price', 'name']) // Chỉ cho phép các cột này
  orderBy?: 'createdAt' | 'price' | 'name';
}