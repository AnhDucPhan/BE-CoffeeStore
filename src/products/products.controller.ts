// src/products/products.controller.ts
import { 
  Controller, Post, Body, UseInterceptors, UploadedFile, 
  BadRequestException, InternalServerErrorException, 
  Get,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { FilterProductDto } from './dto/filter-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('thumbnail'))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('--------------------------------------------------');
    console.log('🚀 1. Đã nhận Request!');
    console.log('📦 2. Body nhận được:', createProductDto);
    console.log('📂 3. File nhận được:', file ? 'Có file' : 'Không có file');

    if (!file) {
      console.log('❌ Lỗi: Thiếu file');
      throw new BadRequestException('Cần phải có ảnh thumbnail!');
    }

    try {
      console.log('☁️ 4. Đang upload lên Cloudinary...');
      const image = await this.cloudinaryService.uploadImage(file);
      console.log('✅ 5. Upload xong. URL:', image.secure_url);

      // Ép kiểu thủ công để chắc chắn không bị lỗi String/Number
      const productData = {
        ...createProductDto,
        price: Number(createProductDto.price), // Chuyển chuỗi "25000" -> số 25000
        stock: createProductDto.stock ? Number(createProductDto.stock) : 0,
        categoryId: createProductDto.categoryId ? Number(createProductDto.categoryId) : undefined,
        thumbnail: image.secure_url,
      };

      console.log('💾 6. Dữ liệu chuẩn bị lưu vào DB:', productData);
      
      const result = await this.productsService.create(productData);
      console.log('🎉 7. Lưu DB thành công!');
      
      return result;

    } catch (error) {
      // 👇 DÒNG NÀY SẼ IN LỖI RA TERMINAL
      console.error('🔥🔥🔥 LỖI BẮT ĐƯỢC:', error);
      
      // Trả về lỗi chi tiết cho Postman xem luôn
      throw new InternalServerErrorException({
        message: 'Lỗi server nội bộ',
        errorCheck: error.message, // Đọc dòng này trong Postman
        stack: error.stack // Xem dòng này để biết lỗi ở file nào
      });
    }
  }

  @Get()
  findAll(@Query() query: FilterProductDto) {
    return this.productsService.findAll(query);
  }
}