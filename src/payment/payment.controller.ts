import { Controller, Post, Body, Req, UseGuards, Get, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-url')
  createPaymentUrl(@Body() body: { amount: number }, @Req() req: Request) {
    const { amount } = body;

    // VNPay bắt buộc phải gửi kèm địa chỉ IP của người mua
    const ipAddr = 
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    // Gọi Service để nặn ra cái link
    const checkoutUrl = this.paymentService.createPaymentUrl(amount, ipAddr as string);

    // Trả cái link đó về cho Frontend
    return {
      message: 'Tạo link VNPay thành công',
      checkoutUrl: checkoutUrl
    };
  }
  @UseGuards(JwtAuthGuard)
  @Get('vnpay-return')
  async vnpayReturn(@Query() query: any, @User() user: any) {
    return this.paymentService.verifyPaymentReturn(query, Number(user.userId));
  }
}