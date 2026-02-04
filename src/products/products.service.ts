import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { PaginatedResult, paginator } from 'src/common/helpers/paginator';
import { Product } from '@prisma/client';

const paginate = paginator({ perPage: 10 });

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  async create(createProductDto: CreateProductDto) {
    // 1. Tạo slug tự động từ tên sản phẩm (Ví dụ: "Cà Phê Sữa" -> "ca-phe-sua")
    // Nếu bảng Product của bạn có cột slug thì BẮT BUỘC phải làm bước này
    const slug = this.generateSlug(createProductDto.name);

    // 2. Kiểm tra xem slug đã tồn tại chưa (tránh lỗi trùng lặp)
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug: slug },
    });

    if (existingProduct) {
      throw new BadRequestException('Sản phẩm này đã tồn tại (trùng tên)!');
    }

    // 3. Lưu vào Database
    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
        price: createProductDto.price,       // Đã được convert sang number ở DTO/Controller
        description: createProductDto.description,
        stock: createProductDto.stock ?? 0,  // Nếu null thì để mặc định là 0
        thumbnail: createProductDto.thumbnail,
        isActive: createProductDto.isActive ?? true,
        slug: slug, // Lưu slug vừa tạo

        // Xử lý Category (Nếu có relation)
        ...(createProductDto.categoryId && {
          categoryId: createProductDto.categoryId
        }),
      },
    });
  }

  // src/products/products.service.ts

  async findAll(query: FilterProductDto): Promise<PaginatedResult<Product>> {
    
    
    const orderByField = query.orderBy || 'createdAt';

    // Nếu FE không gửi sort thì lấy 'desc'
    const sortDirection = query.sort || 'desc';

    return paginate(
      this.prisma.product,
      {
        
        orderBy: {
          // Sử dụng cú pháp Dynamic Key
          [orderByField]: sortDirection
        },
      },
      {
        page: query.page,
        perPage: query.items_per_page,
      }
    );
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }

  private generateSlug(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')     // Thay khoảng trắng bằng dấu gạch ngang
      .replace(/[^\w\-]+/g, '') // Xóa các ký tự đặc biệt
      .replace(/\-\-+/g, '-');  // Xóa các dấu gạch ngang liên tiếp
  }
}
