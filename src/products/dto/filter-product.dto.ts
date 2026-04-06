import { IsOptional, IsString } from 'class-validator';

export class FilterProductDto {
  @IsOptional()
  @IsString()
  page?: string;

  // Dùng cho Shop bên Frontend khách hàng
  @IsOptional()
  @IsString()
  items_per_page?: string; 

  // Dùng cho trang MenuAdmin
  @IsOptional()
  @IsString()
  perPage?: string;

  // 👇 Thêm q để nhận từ khóa tìm kiếm (Tên món)
  @IsOptional()
  @IsString()
  q?: string;

  // Nhận ID của nhóm món để lọc
  @IsOptional()
  @IsString()
  productCategoryId?: string;

  // Nhận trạng thái để lọc (Đang bán / Ngưng bán)
  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsString()
  orderBy?: string;

  @IsOptional()
  @IsString()
  sort?: string;
}