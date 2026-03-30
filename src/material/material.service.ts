import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { paginator, PaginatedResult } from 'src/common/helpers/paginator';
import { Prisma } from '@prisma/client';

const paginate = paginator({ perPage: 10 });

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  // 1. TẠO MỚI NGUYÊN LIỆU
  async create(data: CreateMaterialDto) {
    // Kiểm tra trùng mã (nếu có gửi mã lên)
    if (data.code) {
      const existing = await this.prisma.material.findUnique({ where: { code: data.code } });
      if (existing) throw new BadRequestException('Mã nguyên vật liệu đã tồn tại!');
    }

    return this.prisma.material.create({ data });
  }

  // Cập nhật tham số: categoryFilter giờ sẽ là số (categoryId)
  async findAll(
    page: number = 1,
    perPage: number = 10,
    searchTerm?: string,
    categoryIdFilter?: string, // FE sẽ gửi lên ID dạng string qua URL (VD: ?categoryId=2)
    statusFilter?: string,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.MaterialWhereInput = {};

    if (searchTerm && searchTerm.trim() !== '') {
      where.name = { contains: searchTerm, mode: 'insensitive' };
    }

    // 👇 Sửa lại cách lọc danh mục
    if (categoryIdFilter && categoryIdFilter !== 'all') {
      where.categoryId = Number(categoryIdFilter); 
    }

    if (statusFilter && statusFilter !== 'all') {
      where.isActive = statusFilter === 'active';
    }

    return paginate(
      this.prisma.material,
      {
        where,
        // 👇 THÊM INCLUDE NÀY ĐỂ LẤY ĐƯỢC TÊN DANH MỤC TRẢ VỀ CHO FRONTEND
        include: {
          category: {
            select: { id: true, name: true }
          }
        },
        orderBy: [{ createdAt: 'desc' }],
      },
      { page, perPage }
    );
  }

  // 3. XEM CHI TIẾT 1 MÓN
  async findOne(id: number) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Không tìm thấy nguyên vật liệu!');
    return material;
  }

  // 4. CẬP NHẬT
  async update(id: number, data: UpdateMaterialDto) {
    await this.findOne(id); // Check xem có tồn tại không trước khi sửa
    
    // Nếu đổi mã code, check xem có trùng với mã của đứa khác không
    if (data.code) {
      const existing = await this.prisma.material.findUnique({ where: { code: data.code } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Mã nguyên vật liệu này đang được sử dụng bởi món khác!');
      }
    }

    return this.prisma.material.update({
      where: { id },
      data,
    });
  }

  // 5. XÓA
  async remove(id: number) {
    await this.findOne(id); // Check tồn tại
    await this.prisma.material.delete({ where: { id } });
    return { success: true, message: 'Đã xóa nguyên vật liệu thành công!' };
  }
}