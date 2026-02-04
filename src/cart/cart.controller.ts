import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  addToCart(@Body() dto: AddToCartDto) {
    console.log('🔥 BACKEND ĐÃ NHẬN REQUEST:', dto);
    return this.cartService.addToCart(dto);
  }

  @Get()
  getCart(@Query('userId') userId: string) {
      // Ép kiểu userId về number
      return this.cartService.getCart(Number(userId));
  }
}