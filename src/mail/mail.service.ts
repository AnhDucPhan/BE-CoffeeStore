import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // VD: cskh.cofybrew@gmail.com
        pass: process.env.EMAIL_PASSWORD, // Mật khẩu ứng dụng (App Password) của Gmail
      },
    });
  }

  async sendVerificationEmail(userEmail: string, otpCode: string) {
    const mailOptions = {
      from: '"Cofybrew Coffee" <noreply@cofybrew.com>',
      to: userEmail,
      subject: 'Mã xác thực tài khoản Cofybrew',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2>Chào mừng bạn đến với Cofybrew!</h2>
            <p>Mã xác thực tài khoản của bạn là:</p>
            <h1 style="font-size: 40px; letter-spacing: 10px; color: #C19D56; background: #f9f9f9; padding: 20px; border-radius: 10px; display: inline-block;">
                ${otpCode}
            </h1>
            <p>Mã này sẽ hết hạn sau 15 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}