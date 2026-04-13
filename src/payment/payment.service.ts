import { forwardRef, Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as qs from 'qs';
import { CustomerOrderData, OrderService } from 'src/order/order.service';



@Injectable()
export class PaymentService {
  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService
  ) { }

  async processCheckout(userId: number, customerData: CustomerOrderData, ipAddr: string) {
    // 1. Sai khiến OrderService đi tạo đơn hàng dưới Database
    const newOrder = await this.orderService.createOrder(userId, customerData);

    // 👇 2. ÉP KIỂU Number(newOrder.totalAmount) Ở ĐÂY
    const checkoutUrl = this.createPaymentUrl(Number(newOrder.totalAmount), newOrder.orderCode, ipAddr);

    // 3. Trả kết quả về cho Controller
    return { success: true, checkoutUrl, orderCode: newOrder.orderCode };
  }

  

  createPaymentUrl(amount: number, orderCode: string, ipAddr: string): string {
    const tmnCode = process.env.VNP_TMNCODE || '';
    const secretKey = (process.env.VNP_HASHSECRET || '').trim();
    const vnpUrl = process.env.VNP_URL || '';
    const returnUrl = process.env.VNP_RETURNURL || '';

    const safeIpAddr = '12.34.56.78';

    const vnTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const date = new Date(vnTime);
    const createDate = this.formatDate(date);

    let vnp_Params: any = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderCode; // 👈 Gắn orderCode của Database vào đây
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderCode;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = Math.floor(Number(amount) * 100);
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = safeIpAddr;
    vnp_Params['vnp_CreateDate'] = createDate;

    vnp_Params = this.sortObject(vnp_Params);
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;
    return vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });
  }

  async verifyPaymentReturn(vnpayParamsRaw: any) {
    const secretKey = (process.env.VNP_HASHSECRET || '').trim();
    let vnpayParams = { ...vnpayParamsRaw };

    const secureHash = vnpayParams['vnp_SecureHash'];
    delete vnpayParams['vnp_SecureHash'];
    delete vnpayParams['vnp_SecureHashType'];

    vnpayParams = this.sortObject(vnpayParams);
    const signData = qs.stringify(vnpayParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const responseCode = vnpayParams['vnp_ResponseCode'];
      const txnRef = vnpayParams['vnp_TxnRef']; // Chính là orderCode

      if (responseCode === '00') {
        try {
          // 👇 CHỈ CẦN GỌI HÀM CẬP NHẬT TRẠNG THÁI VÀ DỌN GIỎ HÀNG
          await this.orderService.completeOrderPayment(txnRef);

          return { isSuccess: true, message: 'Giao dịch thành công!' };
        } catch (error) {
          console.error("Lỗi hoàn tất đơn hàng:", error);
          return { isSuccess: false, message: 'Lỗi hệ thống khi hoàn tất đơn hàng' };
        }
      } else {
        return { isSuccess: false, message: 'Giao dịch thất bại hoặc bị hủy' };
      }
    } else {
      return { isSuccess: false, message: 'Chữ ký không hợp lệ' };
    }
  }

  // --- HÀM PHỤ TRỢ (Giữ nguyên) ---
  private sortObject(obj: any) {
    const sorted: any = {};
    const str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(String(obj[str[key]])).replace(/%20/g, '+');
    }
    return sorted;
  }

  private formatDate(date: Date) {
    const yyyy = date.getFullYear().toString();
    const MM = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const HH = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }
}