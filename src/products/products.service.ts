import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { PaginatedResult, paginator } from 'src/common/helpers/paginator';
import { Product } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';


const paginate = paginator({ perPage: 10 });

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService,private readonly cloudinaryService: CloudinaryService,) { }

  async create(createProductDto: CreateProductDto, file: Express.Multer.File) {
    try {
      // 1. Validate File (Logic nghiệp vụ)
      if (!file) {
        throw new BadRequestException('Cần phải có ảnh thumbnail!');
      }

      // 2. Upload lên Cloudinary
      // (Giả sử bạn đã sửa CloudinaryService nhận tham số folder như bài trước)
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'products');

      // 3. Xử lý dữ liệu (Convert String -> Number/Boolean)
      // Vì multipart/form-data gửi mọi thứ lên dạng String
      const price = Number(createProductDto.price);
      const stock = createProductDto.stock ? Number(createProductDto.stock) : 0;
      const categoryId = createProductDto.categoryId ? Number(createProductDto.categoryId) : undefined;

      // Xử lý isActive (đôi khi gửi lên là chuỗi "true"/"false")
      const isActive = createProductDto.isActive !== undefined
        ? String(createProductDto.isActive) === 'true'
        : true;

      // 4. Tạo Slug & Check trùng (Logic cũ)
      const slug = this.generateSlug(createProductDto.name);
      const existingProduct = await this.prisma.product.findUnique({
        where: { slug },
      });

      if (existingProduct) {
        throw new BadRequestException('Sản phẩm này đã tồn tại (trùng tên)!');
      }

      // 5. Lưu vào Database
      return await this.prisma.product.create({
        data: {
          name: createProductDto.name,
          description: createProductDto.description,
          price: price,
          stock: stock,
          isActive: isActive,
          thumbnail: uploadResult.secure_url, // URL từ Cloudinary
          slug: slug,
          ...(categoryId && { categoryId }),
        },
      });

    } catch (error) {
      // Log lỗi để debug
      console.error('Service Error:', error);

      // Nếu là lỗi BadRequest (do mình throw) thì ném tiếp
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Còn lại là lỗi hệ thống
      throw new InternalServerErrorException('Lỗi khi tạo sản phẩm: ' + error.message);
    }
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
