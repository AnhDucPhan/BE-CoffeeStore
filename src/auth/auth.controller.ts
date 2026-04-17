import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: any) {
    // Lời khuyên: Bạn nên thay 'any' bằng class RegisterDto của bạn để validate dữ liệu
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { email: string; otpCode: string }) {
    // Frontend sẽ gửi cục JSON { "email": "...", "otpCode": "123456" } xuống đây
    return this.authService.verifyEmail(body.email, body.otpCode);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Post('google')
  async googleLogin(@Body() body: GoogleLoginDto) {
    return this.authService.googleLogin(body);
  }

}
