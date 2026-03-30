import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
    constructor(private prisma: PrismaService) { }

    async addToCart(dto: AddToCartDto, userId: number) {
        const { productId, quantity } = dto;

        // 1. Kiểm tra sản phẩm
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

        // 2. Tìm hoặc tạo Giỏ hàng
        let cart = await this.prisma.cart.findFirst({
            where: { userId: userId || -1 }
        });

        if (!cart) {
            cart = await this.prisma.cart.create({
                data: { userId: userId }
            });
        }

        // 3. Kiểm tra item trong giỏ
        const cartItem = await this.prisma.cartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId: productId
                }
            }
        });

        if (cartItem) {
            // Cộng dồn
            return this.prisma.cartItem.update({
                where: { id: cartItem.id },
                data: { quantity: cartItem.quantity + quantity },
                include: { product: true }
            });
        } else {
            // Tạo mới
            return this.prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: productId,
                    quantity: quantity
                },
                include: { product: true }
            });
        }
    }

    async getCart(userId: number) {
        return this.prisma.cart.findFirst({
            where: { userId },
            include: {
                items: {
                    include: { product: true },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })
    }


    async removeCartItem(itemId: number, userId: number) {
        const cartItem = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cart: {
                    userId: userId

                }
            }
        });
        if (!cartItem) {
            throw new NotFoundException('Sản phẩm không tồn tại trong giỏ hàng của bạn');
        }
        await this.prisma.cartItem.delete({
            where: { id: itemId }
        });
        return { message: 'Xoá sản phẩm khỏi giỏ hàng thành công' };

    }

    // ... các hàm addToCart, getCart cũ của bạn ...

    async clearCart(userId: number) {
        // 1. Tìm giỏ hàng của user hiện tại
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
        });

        if (!cart) {
            // Nếu user chưa có giỏ hàng thì không cần làm gì cả
            return { success: true, message: 'Giỏ hàng đã trống sẵn' };
        }

        // 2. Xóa toàn bộ CartItem có cartId trùng với giỏ hàng vừa tìm được
        await this.prisma.cartItem.deleteMany({
            where: {
                cartId: cart.id,
            },
        });

        return {
            success: true,
            message: 'Đã dọn sạch giỏ hàng thành công!'
        };
    }
}