import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add')
  addToCart(
    @Body() dto: AddToCartDto,
    @User() user: any
  ) {
    console.log('🔥 BACKEND ĐÃ NHẬN REQUEST:', dto);
    return this.cartService.addToCart(dto,user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getCart(@User() user: any) {
      // Ép kiểu userId về number
      return this.cartService.getCart(Number(user.userId));
  }
}