import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as qs from 'qs';
import { OrderService } from 'src/order/order.service';

@Injectable()
export class PaymentService {
  constructor(private readonly orderService: OrderService) { }

  createPaymentUrl(amount: number, ipAddr: string): string {
    // 👇 Gọi ngược lại từ file .env (Thêm fallback rỗng để không bị lỗi TypeScript)
    const tmnCode = process.env.VNP_TMNCODE || '';
    const secretKey = (process.env.VNP_HASHSECRET || '').trim(); // Vẫn giữ trim() cho chắc cốp
    const vnpUrl = process.env.VNP_URL || '';
    const returnUrl = process.env.VNP_RETURNURL || '';

    // Ép cứng IP xịn để test ở Localhost không bị lỗi (Khi lên production có thể dùng lại biến ipAddr)
    const safeIpAddr = '12.34.56.78';

    // Xử lý múi giờ VN an toàn
    const vnTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const date = new Date(vnTime);
    const createDate = this.formatDate(date);
    const orderId = date.getTime().toString();

    let vnp_Params: any = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = Math.floor(Number(amount) * 100);
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = safeIpAddr;
    vnp_Params['vnp_CreateDate'] = createDate;

    // 1. Sắp xếp tham số chuẩn
    vnp_Params = this.sortObject(vnp_Params);

    // 2. Nối chuỗi & Tạo Hash
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 3. Gắn chữ ký và ra lò cái Link
    vnp_Params['vnp_SecureHash'] = signed;
    const paymentUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });

    return paymentUrl;
  }

  async verifyPaymentReturn(vnpayParamsRaw: any, userId: number) {
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
      const txnRef = vnpayParams['vnp_TxnRef']; // Mã đơn hàng tạm lúc trước mình tạo

      // Mã '00' là giao dịch thành công (Khách đã bị trừ tiền)
      if (responseCode === '00') {
        try {
          // Gọi sang OrderService để TẠO ĐƠN HÀNG & XÓA GIỎ HÀNG
          await this.orderService.createOrderFromCart(userId, txnRef);

          return { isSuccess: true, message: 'Giao dịch thành công!' };
        } catch (error) {
          console.error("Lỗi tạo đơn hàng:", error);
          return { isSuccess: false, message: 'Lỗi hệ thống khi tạo đơn hàng' };
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