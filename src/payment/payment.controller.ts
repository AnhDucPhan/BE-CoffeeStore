import { Controller, Post, Body, Req, UseGuards, Get, Query, Ip } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';
import { CustomerOrderData } from 'src/order/order.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('vnpay-return')
  async vnpayReturn(@Query() query: any) {
    // API này giờ là Public. Bảo mật dựa vào việc check chữ ký Hash của VNPay.
    return this.paymentService.verifyPaymentReturn(query);
  }

  // API Checkout thì vẫn cần Guard vì cần biết ai đang mua hàng
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(
    @User() user: any, 
    @Body() customerData: CustomerOrderData, 
    @Ip() ipAddr: string 
  ) {
    const userId = Number(user.userId);
    let ip = ipAddr === '::1' ? '127.0.0.1' : ipAddr;

    return await this.paymentService.processCheckout(userId, customerData, ip);
  }

  
}