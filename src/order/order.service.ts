import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsService } from 'src/products/products.service';

export interface CustomerOrderData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  shippingMethod: string;
  streetAddress?: string;
  apartment?: string;
  pickupTime?: string;
  orderNotes?: string;
  itemsToBuy: {
    productId: number;
    quantity: number;
  }[];
}

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) { }

  // =========================================================================
  // 1. TẠO ĐƠN HÀNG TỪ GIỎ HÀNG (CHỈ TÍNH CÁC MÓN ĐƯỢC CHỌN)
  // =========================================================================
  async createOrder(userId: number, customerData: CustomerOrderData) {
    if (!customerData.itemsToBuy || customerData.itemsToBuy.length === 0) {
      throw new BadRequestException('Không có sản phẩm nào để thanh toán!');
    }

    // 1. Lấy danh sách ID sản phẩm khách muốn mua
    const productIds = customerData.itemsToBuy.map(item => item.productId);

    // 2. Query Database để lấy giá tiền CHUẨN (Chống hack đổi giá từ Frontend)
    const productsInDb = await this.prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    let totalAmount = 0;
    const orderItemsData = [];

    // 3. Lắp ráp dữ liệu và tính tổng tiền
    for (const item of customerData.itemsToBuy) {
      const dbProduct = productsInDb.find(p => p.id === item.productId);

      if (!dbProduct) {
        throw new BadRequestException(`Sản phẩm ID ${item.productId} không tồn tại hoặc đã ngừng bán!`);
      }

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: dbProduct.price, // Lấy giá từ DB, KHÔNG lấy từ FE
      });

      totalAmount += Number(dbProduct.price) * item.quantity;
    }

    // 4. Tạo mã Order
    const now = new Date();
    const orderCode =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');

    // 5. Lưu vào Database
    const newOrder = await this.prisma.order.create({
      data: {
        orderCode, userId, totalAmount,
        paymentMethod: 'VNPAY', paymentStatus: 'PENDING', orderStatus: 'PENDING',
        firstName: customerData.firstName, lastName: customerData.lastName, phone: customerData.phone,
        email: customerData.email || null, shippingMethod: customerData.shippingMethod === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY',
        streetAddress: customerData.streetAddress || null, apartment: customerData.apartment || null,
        pickupTime: customerData.pickupTime || null, note: customerData.orderNotes || null,
        items: {
          create: orderItemsData,
        },
      },
    });

    return newOrder;
  }



  // =========================================================================
  // 3. XỬ LÝ HOÀN TẤT ĐƠN HÀNG (KHI VNPAY GỌI VỀ)
  // =========================================================================
  async completeOrderPayment(orderCode: string) {
    console.log("✅ [IPN] Bắt đầu xử lý hoàn tất đơn hàng:", orderCode);

    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { items: true }
    });

    if (!order) throw new Error("Không tìm thấy đơn hàng");
    if (order.paymentStatus === 'COMPLETED') return;

    await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật Order thành COMPLETED
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'COMPLETED', orderStatus: 'PROCESSING' }
      });

      // 👇 2. DỌN SẠCH GIỎ HÀNG (CHỈ XÓA NHỮNG MÓN ĐÃ MUA)
      const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
      if (cart) {
        // Lấy danh sách ID các sản phẩm vừa thanh toán xong
        const boughtProductIds = order.items.map(item => item.productId);

        // Chỉ xóa trong bảng cartItem những món có productId nằm trong list trên
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            productId: { in: boughtProductIds }
          }
        });
      }

      // 3. Tăng lượt mua trong DB
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.quantity } }
        });
      }
    });

    // 4. Bơm điểm Redis Best Seller
    try {
      await Promise.all(
        order.items.map(item => this.productsService.updateBestSellerRank(item.productId, item.quantity))
      );
    } catch (e) {
      console.error("Lỗi bơm Redis:", e);
    }
  }

  // =========================================================================
  // 4. LẤY LỊCH SỬ ĐƠN HÀNG
  // =========================================================================
  async getUserOrders(userId: number) {
    console.log(`Lấy lịch sử mua hàng của User ID: ${userId}`);

    const orders = await this.prisma.order.findMany({
      where: {
        userId: userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      message: 'Lấy lịch sử đơn hàng thành công',
      data: orders,
    };
  }
}