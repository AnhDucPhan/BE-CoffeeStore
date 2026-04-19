// auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { PrismaService } from 'src/prisma/prisma.service';
// 👇 Bạn nhớ import MailService theo đúng đường dẫn trong dự án của bạn nhé
import { MailService } from 'src/mail/mail.service'; 

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService // 👈 Inject MailService vào đây
  ) {}

  // ====================================================================
  // 1. KIỂM TRA ĐĂNG NHẬP (Dùng cho luồng Credentials)
  // ====================================================================
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    
    // Kiểm tra tài khoản có bị khóa không
    if (user && user.status !== 'Active') { 
       throw new UnauthorizedException("Tài khoản đang bị khóa (Inactive)!");
    }

    // 👇 KIỂM TRA ĐÃ XÁC THỰC EMAIL CHƯA
    if (user && !user.isEmailVerified) {
       throw new UnauthorizedException("Vui lòng xác thực email trước khi đăng nhập!");
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any) {
    // 🛡 LỚP BẢO VỆ 1: Kiểm tra user có tồn tại không
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng!');
    }

    try {
      // 🛡 LỚP BẢO VỆ 2: An toàn bóc tách dữ liệu
      const payload = { email: user.email, sub: user.id, role: user.role };
      const { password, ...userInfo } = user;

      // 🛡 LỚP BẢO VỆ 3: Bắt lỗi lúc tạo Token
      const token = this.jwtService.sign(payload);

      return {
        user: userInfo,
        access_token: token,
      };
      
    } catch (error:any) {
      console.error('🚨 LỖI TẠO TOKEN:', error.message);
      throw new InternalServerErrorException('Lỗi hệ thống khi tạo phiên đăng nhập. Vui lòng kiểm tra JWT_SECRET');
    }
}

  // ====================================================================
  // 2. ĐĂNG KÝ TÀI KHOẢN MỚI (Tự nhập Email/Pass)
  // ====================================================================
  async register(dto: any) { // Thay 'any' bằng RegisterDto của bạn
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verifyTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name || '',
        role: 'USER',
        phoneNumber: '',
        status: 'Active',
        isEmailVerified: false,
        verifyToken: otpCode,
        verifyTokenExpires,
      },
    });

    // Gửi mail ngầm
    this.mailService.sendVerificationEmail(newUser.email, otpCode).catch(console.error);

    return { success: true, message: 'Vui lòng kiểm tra email để nhận mã xác thực!', email: newUser.email };
  }

  // ====================================================================
  // 3. XÁC THỰC MÃ OTP 6 SỐ
  // ====================================================================
  async verifyEmail(email: string, otpCode: string) {
    const user = await this.prisma.user.findFirst({
      where: { 
         email: email,
         verifyToken: otpCode 
      },
    });

    if (!user) {
      throw new BadRequestException('Mã xác thực không đúng!');
    }

    if (user.verifyTokenExpires < new Date()) {
      throw new BadRequestException('Mã xác thực đã hết hạn!');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verifyToken: null,
        verifyTokenExpires: null,
      },
    });

    return { success: true, message: 'Xác thực email thành công!' };
  }

  // ====================================================================
  // 4. ĐĂNG NHẬP BẰNG GOOGLE (Ép xác thực OTP)
  // ====================================================================
  async googleLogin(dto: GoogleLoginDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // TRƯỜNG HỢP A: CHƯA CÓ TÀI KHOẢN -> TẠO MỚI & BẮT XÁC THỰC
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verifyTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          avatar: dto.avatar,
          password: hashedPassword,
          role: 'USER', 
          status: 'Active',
          phoneNumber: '',
          isEmailVerified: false, // 👈 KHOÁ LẠI
          verifyToken: otpCode,
          verifyTokenExpires,
        },
      });

      this.mailService.sendVerificationEmail(user.email, otpCode).catch(console.error);

      // Trả về cờ hiệu cho Frontend biết phải mở form nhập 6 số
      return { success: true, requiresVerification: true, email: user.email };
    } 
    
    // TRƯỜNG HỢP B: ĐÃ CÓ TÀI KHOẢN NHƯNG CHƯA TỪNG XÁC THỰC
    if (!user.isEmailVerified) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verifyTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          avatar: dto.avatar && user.avatar !== dto.avatar ? dto.avatar : undefined,
          verifyToken: otpCode,
          verifyTokenExpires
        }
      });

      this.mailService.sendVerificationEmail(user.email, otpCode).catch(console.error);

      return { success: true, requiresVerification: true, email: user.email };
    }

    // TRƯỜNG HỢP C: TÀI KHOẢN ĐÃ XÁC THỰC TỪ TRƯỚC -> CHO PHÉP ĐĂNG NHẬP
    // (Cập nhật avatar nếu có đổi trên Google)
    if (dto.avatar && user.avatar !== dto.avatar) {
      user = await this.prisma.user.update({
        where: { email: user.email },
        data: { avatar: dto.avatar }
      });
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };

    const access_token = this.jwtService.sign(payload);
    delete user.password;

    return {
      success: true,
      user: user,
      access_token: access_token,
    };
  }
}