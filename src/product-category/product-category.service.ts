import { Injectable } from '@nestjs/common';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { PrismaService } from '../prisma/prisma.service'; // Nhớ import PrismaService của bạn

@Injectable()
export class ProductCategoryService {
  // Inject Prisma vào
  constructor(private prisma: PrismaService) {}

  // API 1: Tạo danh mục mới
  create(createProductCategoryDto: CreateProductCategoryDto) {
    return this.prisma.productCategory.create({
      data: {
        name: createProductCategoryDto.name,
        description: createProductCategoryDto.description, // Nhớ khai báo các biến này bên DTO
      }
    });
  }

  // API 2: Lấy tất cả danh mục (Frontend của bạn đang rất cần cái này!)
  findAll() {
    return this.prisma.productCategory.findMany({
      // Lấy danh mục, tiện tay đếm xem mỗi danh mục có bao nhiêu sản phẩm luôn
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
  }

  findOne(id: number) {
    return this.prisma.productCategory.findUnique({
      where: { id }
    });
  }

  update(id: number, updateProductCategoryDto: UpdateProductCategoryDto) {
    return this.prisma.productCategory.update({
      where: { id },
      data: updateProductCategoryDto
    });
  }

  remove(id: number) {
    return this.prisma.productCategory.delete({
      where: { id }
    });
  }
}