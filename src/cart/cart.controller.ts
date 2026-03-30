import { Controller, Post, Body, Get, Query, UseGuards, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @UseGuards(JwtAuthGuard)
  @Post('add')
  addToCart(
    @Body() dto: AddToCartDto,
    @User() user: any
  ) {
    console.log('🔥 BACKEND ĐÃ NHẬN REQUEST:', dto);
    return this.cartService.addToCart(dto, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getCart(@User() user: any) {
    return this.cartService.getCart(Number(user.userId));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('item/:id')
  async removeCartItem(
    @Param('id', ParseIntPipe) itemId: number,
    @User() user: any
  ){
    return this.cartService.removeCartItem(itemId, Number(user.userId));
  }

  // Xóa toàn bộ sản phẩm trong giỏ hàng
  @UseGuards(JwtAuthGuard)
  @Delete('clear')
  async clearCart(@User() user: any) {
    console.log(`🧹 Đang tiến hành dọn sạch giỏ hàng cho User ID: ${user.userId}`);
    return this.cartService.clearCart(Number(user.userId));
  }
}