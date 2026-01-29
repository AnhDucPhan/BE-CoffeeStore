import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @IsString()
    @ApiProperty({ example: 'abc@gmail.com', description: 'Email người dùng để đăng nhập' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @IsString()
    @ApiProperty({ example: '123456', description: 'Mật khẩu tài khoản' })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    password: string;

}
