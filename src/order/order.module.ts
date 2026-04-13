import { forwardRef, Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductsModule } from 'src/products/products.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
  imports: [PrismaModule, ProductsModule,forwardRef(() => PaymentModule)] 
})
export class OrderModule {}
