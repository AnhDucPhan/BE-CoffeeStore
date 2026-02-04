import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { 
  IsBoolean, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsString, 
  Min, 
  IsArray 
} from 'class-validator';

export class CreateProductDto {
  // 1. Tên sản phẩm
  @ApiProperty({ example: 'Cà phê Sữa Đá', description: 'Tên của sản phẩm' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  name: string;

  // 2. Giá tiền (Quan trọng: Phải convert từ string sang number vì gửi qua form-data)
  @ApiProperty({ example: 25000, description: 'Giá bán (VNĐ)' })
  @IsNotEmpty({ message: 'Giá tiền không được để trống' })
  @Type(() => Number) // 👈 Tự động ép kiểu chuỗi "25000" thành số 25000
  @IsNumber({}, { message: 'Giá tiền phải là số' })
  @Min(0, { message: 'Giá tiền không được âm' })
  price: number;

  // 3. Số lượng tồn kho
  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @Type(() => Number) // 👈 Tự động ép kiểu
  @IsNumber()
  @Min(0)
  stock?: number;

  // 4. Mô tả
  @ApiPropertyOptional({ example: 'Cà phê nguyên chất...', description: 'Mô tả chi tiết' })
  @IsOptional()
  @IsString()
  description?: string;

  // 5. Ảnh đại diện (Đây là cái bạn đang thiếu lúc nãy)
  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File ảnh upload' })
  @IsOptional() 
  @IsString()
  thumbnail?: string; // 👈 Để Optional vì lúc submit form chưa có URL, Controller mới gán vào

  // 6. Danh mục (ID)
  @ApiPropertyOptional({ example: 1, description: 'ID của danh mục cha' })
  @IsOptional()
  @Type(() => Number) // 👈 Ép kiểu ID về số
  @IsNumber()
  categoryId?: number;

  // 7. Trạng thái hiển thị (Active)
  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  // Transform này giúp convert chuỗi "true"/"false" từ form-data thành boolean thật
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}