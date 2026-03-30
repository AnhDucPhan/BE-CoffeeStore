import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/add-to-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCategoryDto) {
    // Check trùng tên danh mục
    const existing = await this.prisma.category.findUnique({ where: { name: data.name } });
    if (existing) throw new BadRequestException('Tên danh mục này đã tồn tại!');

    return this.prisma.category.create({ data });
  }

  // Lấy toàn bộ danh mục (Không phân trang để FE làm menu Dropdown)
  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async remove(id: number) {
    // Check xem danh mục này có đang chứa nguyên liệu nào không, nếu có thì không cho xóa
    const count = await this.prisma.material.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new BadRequestException('Không thể xóa danh mục đang chứa nguyên vật liệu!');
    }
    return this.prisma.category.delete({ where: { id } });
  }
}