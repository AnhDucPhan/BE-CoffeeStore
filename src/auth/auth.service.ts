// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && user.status !== 'Active') { 
       throw new UnauthorizedException("Tài khoản đang bị khóa (Inactive)!");
    }
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const { password, ...userInfo } = user;
    return {
      user: userInfo,
      access_token: this.jwtService.sign(payload),
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    // 1. Tìm user theo email
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 2. Nếu chưa có tài khoản -> Tạo mới
    if (!user) {
      // Băm một mật khẩu ngẫu nhiên cho user Google (vì Prisma có thể bắt buộc trường password)
      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          avatar: dto.avatar,
          password: hashedPassword,
          role: 'USER', 
          status: 'Active',
          phoneNumber: '',
          // Điền thêm các trường bắt buộc khác nếu schema Prisma của bạn yêu cầu
        },
      });
    } else {
      // (Tuỳ chọn) Nếu user đã tồn tại nhưng đổi avatar/tên trên Google, bạn có thể update lại
      if (dto.avatar && user.avatar !== dto.avatar) {
         user = await this.prisma.user.update({
           where: { email: user.email },
           data: { avatar: dto.avatar }
         });
      }
    }

    // 3. Tạo Payload và Ký JWT Token (Giống hệt cách bạn làm ở hàm login cũ)
    const payload = { 
      sub: user.id, // hoặc id: user.id
      email: user.email, 
      role: user.role 
    };

    const access_token = this.jwtService.sign(payload);

    // 4. Xóa password trước khi trả về Frontend cho an toàn
    delete user.password;

    return {
      user: user,
      access_token: access_token,
    };
  }
}
