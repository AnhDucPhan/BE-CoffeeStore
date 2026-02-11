import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'abc@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ ' })
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Password ko the de trong' })
  @MinLength(6, { message: 'Password phải ít nhất 6 ký tự' })
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsString()
  @IsNotEmpty({ message: 'Password ko the de trong' })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
