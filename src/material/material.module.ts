import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { MaterialsController } from './material.controller';
import { MaterialsService } from './material.service';

@Module({
  imports: [PrismaModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
})
export class MaterialModule {}
