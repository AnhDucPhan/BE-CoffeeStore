import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { ScheduleModule } from './schedule/schedule.module';
import { NotificationModule } from './notification/notification.module';
import { PaymentModule } from './payment/payment.module';
import { OrderModule } from './order/order.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { SalaryModule } from './salary/salary.module';
import { MaterialModule } from './material/material.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), UsersModule, PrismaModule, AuthModule, ProductsModule, CartModule, ScheduleModule, NotificationModule, PaymentModule, OrderModule, AttendanceModule, PayrollModule, SalaryModule, MaterialModule, CategoriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
