import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'abc@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Password không được để trống' })
  @MinLength(6, { message: 'Password phải ít nhất 6 ký tự' })
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' }) // 👈 Đã sửa lỗi copy-paste ở đây
  phoneNumber: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Barista' })
  @IsOptional()
  @IsString({ message: 'Chức vụ phải là một chuỗi văn bản' })
  position?: string;
}