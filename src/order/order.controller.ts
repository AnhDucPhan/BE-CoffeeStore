import { Body, Controller, Get, Post, UseGuards,Ip } from '@nestjs/common';
import { OrderService } from './order.service';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';



@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getOrderHistory(@User() user: any) {
    // Gọi sang service và truyền userId lấy từ Token
    return this.orderService.getUserOrders(Number(user.userId));
  }

  
}


