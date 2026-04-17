// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // 👈 THÊM DÒNG NÀY ĐỂ XUẤT KHẨU SERVICE
})
export class MailModule {}