import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductCategoryDto {
  @IsString({ message: 'Tên danh mục phải là một chuỗi văn bản' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @MaxLength(100, { message: 'Tên danh mục không được vượt quá 100 ký tự' })
  name: string;

  @IsString({ message: 'Mô tả phải là một chuỗi văn bản' })
  @IsOptional() // Cho phép null hoặc undefined vì trong DB để là String?
  description?: string;
}