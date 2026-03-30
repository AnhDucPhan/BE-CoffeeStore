import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Nhớ check lại đường dẫn file prisma.service của bạn nhé

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // Hàm "Combo 3 bước" xử lý sau khi VNPay báo thanh toán thành công
  async createOrderFromCart(userId: number, vnpayTxnRef: string) {

    const existingOrder = await this.prisma.order.findUnique({
      where: { orderCode: vnpayTxnRef }
    });
    if (existingOrder) {
      // Đơn hàng đã tồn tại (do Frontend gọi lại lần 2).
      // Ném ra một ngoại lệ đặc biệt hoặc trả về thành công luôn.
      // Trả về thẳng thành công để Frontend yên tâm hiển thị tích xanh!
      return { success: true, message: 'Đơn hàng đã tồn tại.' }; 
    }
    // 1. Lấy giỏ hàng và toàn bộ sản phẩm bên trong
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống hoặc không tồn tại!');
    }

    // 2. Tính lại tổng tiền (Bảo mật: Backend luôn tự tính lại, tuyệt đối không tin số tiền Frontend gửi lên)
    const totalAmount = cart.items.reduce((total, item) => {
      return total + (Number(item.product.price) * item.quantity);
    }, 0);

    // 3. Sử dụng Prisma Transaction (All or Nothing)
    const result = await this.prisma.$transaction(async (tx) => {
      
      // Bước 3.1: Tạo Đơn Hàng (Order) và Đổ dữ liệu vào OrderItem
      const newOrder = await tx.order.create({
        data: {
          orderCode: vnpayTxnRef, // Mã giao dịch của VNPay để sau này dễ đối soát
          userId: userId,
          totalAmount: totalAmount,
          paymentMethod: 'VNPAY',
          paymentStatus: 'COMPLETED', // Đã thanh toán thành công
          orderStatus: 'PENDING',     // Chờ shop đóng gói giao hàng
          
          // Prisma hỗ trợ tạo luôn OrderItem cùng lúc với Order (Nested Writes)
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price, // QUAN TRỌNG: Chụp ảnh lưu lại mức giá tại đúng thời điểm mua
            })),
          },
        },
      });

      // Bước 3.2: Dọn sạch giỏ hàng cũ
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    return {
      success: true,
      message: 'Tạo đơn hàng và làm sạch giỏ hàng thành công!',
      orderId: result.id,
      orderCode: result.orderCode
    };
  }

  async getUserOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { 
        userId: userId 
      },
      include: {
        // Lấy luôn danh sách các món hàng trong đơn
        items: {
          include: {
            // Lấy luôn thông tin chi tiết (tên, ảnh, giá) của từng sản phẩm
            product: true, 
          },
        },
      },
      // Sắp xếp ngày tạo giảm dần (Đơn mới nhất lên đầu)
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders;
  }
}