import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { PaginatedResult, paginator } from 'src/common/helpers/paginator';
import { Product } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import Redis from 'ioredis';


const paginate = paginator({ perPage: 10 });

@Injectable()
export class ProductsService {
  private redis: Redis;
  constructor(private prisma: PrismaService, private readonly cloudinaryService: CloudinaryService,) {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async updateBestSellerRank(productId: number, quantityBought: number) { // Đổi productId thành number cho đồng bộ
    // Redis tự động convert number thành string khi lưu, nên không sao cả
    await this.redis.zincrby('best_sellers', quantityBought, productId);
    console.log(`Đã cộng ${quantityBought} lượt mua cho sản phẩm ${productId} vào Redis!`);
  }

  // =========================================================
  // LẤY DANH SÁCH BEST SELLER TỪ REDIS (ĐÃ TỐI ƯU)
  // =========================================================
  async getBestSellers(limit: number = 5) {
    // 🔍 Lớp quét 1: Kiểm tra xem biến môi trường có bị undefined không?
    console.log("🔍 [1] REDIS_URL đang dùng:", process.env.REDIS_URL ? "Có link Upstash" : "BỊ UNDEFINED RỒI!!!");

    const topProductIdsString = await this.redis.zrevrange('best_sellers', 0, limit - 1);
    
    // 🔍 Lớp quét 2: Kiểm tra xem Redis có trả về ['13'] không?
    console.log("🔍 [2] Danh sách ID từ Redis:", topProductIdsString);

    if (topProductIdsString.length === 0) {
      console.log("🛑 Bị chặn lại vì Redis trả về mảng rỗng!");
      return [];
    }

    const topProductIds = topProductIdsString.map((id) => Number(id));

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: topProductIds },
      },
      include: {
        productCategory: true,
      }
    });

    // 🔍 Lớp quét 3: Kiểm tra xem Postgres có tìm thấy sản phẩm số 13 không?
    console.log("🔍 [3] Các ID tìm thấy trong DB Postgres:", products.map(p => p.id));

    const sortedBestSellers = topProductIds.map((id) =>
      products.find((p) => p.id === id)
    ).filter(product => product !== undefined);

    return sortedBestSellers;
  }
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
      const productCategoryId = createProductDto.productCategoryId ? Number(createProductDto.productCategoryId) : undefined;

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
          ...(productCategoryId && { productCategoryId }),
        },
      });

    } catch (error: any) {
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

  async findAll(query: FilterProductDto): Promise<PaginatedResult<Product>> {
    const orderByField = query.orderBy || 'createdAt';
    const sortDirection = query.sort || 'desc';

    // Cấu hình điều kiện tìm kiếm và lọc
    const whereCondition: any = {};

    // 1. Nếu có gửi chữ tìm kiếm (q) -> Tìm theo tên chứa chữ đó
    if (query.q) {
      whereCondition.name = {
        contains: query.q,
        mode: 'insensitive', // Tìm kiếm không phân biệt chữ hoa/chữ thường
      };
    }

    // 2. Nếu có lọc theo danh mục
    if (query.productCategoryId) {
      whereCondition.productCategoryId = Number(query.productCategoryId);
    }

    if (query.isActive !== undefined) {
      whereCondition.isActive = String(query.isActive) === 'true';
    }

    // Lấy số lượng item mỗi trang (ưu tiên perPage của Admin, không có thì lấy của Shop)
    const limit = query.perPage || query.items_per_page || '10';

    return paginate(
      this.prisma.product,
      {
        where: whereCondition, // 👇 Nhét cục where vào đây
        orderBy: {
          [orderByField]: sortDirection
        },
        include: {
          productCategory: true, // Nhớ include cái này để FE MenuAdmin lấy được tên danh mục nhé!
        }
      },
      {
        page: query.page,
        perPage: limit,
      }
    );
  }



  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        productCategory: true, // Lấy kèm luôn thông tin danh mục của sản phẩm
      },
    });

    // Nếu không tìm thấy sản phẩm trong Database thì báo lỗi 404
    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID ${id} không tồn tại`);
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto, file?: Express.Multer.File) {
    try {
      // 1. Kiểm tra sản phẩm có tồn tại không
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new NotFoundException(`Sản phẩm với ID ${id} không tồn tại!`);
      }

      // Khởi tạo object chứa dữ liệu sẽ update
      const updateData: any = {};
      let thumbnailUrl = existingProduct.thumbnail; // Mặc định giữ lại ảnh cũ

      // 2. Xử lý Upload ảnh mới (nếu có gửi file)
      if (file) {
        const uploadResult = await this.cloudinaryService.uploadImage(file, 'products');
        thumbnailUrl = uploadResult.secure_url; // Ghi đè link ảnh mới
        // Mẹo: Nếu CloudinaryService của bạn có hàm xóa ảnh cũ, bạn có thể gọi ở đây
        // await this.cloudinaryService.deleteImage(existingProduct.thumbnail_public_id);
      }
      updateData.thumbnail = thumbnailUrl;

      // 3. Xử lý Text & Convert kiểu dữ liệu (chỉ check những trường có gửi lên)
      if (updateProductDto.name) {
        updateData.name = updateProductDto.name;

        // Sinh slug mới và check trùng
        const newSlug = this.generateSlug(updateProductDto.name);
        const slugExists = await this.prisma.product.findFirst({
          where: { slug: newSlug, id: { not: id } }, // Tìm xem có ai trùng slug mà khác ID hiện tại không
        });

        if (slugExists) {
          throw new BadRequestException('Tên sản phẩm này đã tồn tại!');
        }
        updateData.slug = newSlug;
      }

      if (updateProductDto.description !== undefined) {
        updateData.description = updateProductDto.description;
      }

      if (updateProductDto.price !== undefined) {
        updateData.price = Number(updateProductDto.price);
      }

      if (updateProductDto.stock !== undefined) {
        updateData.stock = Number(updateProductDto.stock);
      }

      if (updateProductDto.productCategoryId !== undefined) {
        updateData.productCategoryId = Number(updateProductDto.productCategoryId);
      }

      if (updateProductDto.isActive !== undefined) {
        updateData.isActive = String(updateProductDto.isActive) === 'true';
      }

      // 4. Lưu dữ liệu đã cập nhật xuống DB
      return await this.prisma.product.update({
        where: { id },
        data: updateData,
      });

    } catch (error: any) {
      console.error('Update Service Error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi khi cập nhật sản phẩm: ' + error.message);
    }
  }

  // 👇 2. HÀM DELETE
  async remove(id: number) {
    try {
      // 1. Check xem có tồn tại không trước khi xóa
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new NotFoundException(`Sản phẩm với ID ${id} không tồn tại!`);
      }

      // 2. Tiến hành xóa
      await this.prisma.product.delete({
        where: { id },
      });

      return {
        message: 'Xóa sản phẩm thành công!',
        success: true
      };

    } catch (error: any) {
      console.error('Delete Service Error:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi khi xóa sản phẩm: ' + error.message);
    }
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
