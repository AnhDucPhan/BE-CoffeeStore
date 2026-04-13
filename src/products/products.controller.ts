// src/products/products.controller.ts
import {
  Controller, Post, Body, UseInterceptors, UploadedFile,
  Get, Query, Patch, Param, Delete, ParseIntPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto'; // 👈 Thêm DTO update
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { FilterProductDto } from './dto/filter-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @UseInterceptors(FileInterceptor('thumbnail'))
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Controller chỉ làm nhiệm vụ chuyển phát nhanh
    return this.productsService.create(createProductDto, file);
  }

  @Get()
  findAll(@Query() query: FilterProductDto) {
    return this.productsService.findAll(query);
  }

  @Get('top/best-sellers')
  async getBestSellers() {
    // Truyền số 5 vào để lấy Top 5 món
    const products = await this.productsService.getBestSellers(5);
    
    return {
      success: true,
      message: 'Lấy danh sách Best Seller thành công!',
      data: products,
    };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('thumbnail'))
  update(
    @Param('id', ParseIntPipe) id: number, // Dùng ParseIntPipe để ép kiểu string -> number an toàn
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File, // File ở đây có thể undefined nếu user chỉ sửa text, không đổi ảnh
  ) {
    console.log('DỮ LIỆU DTO NHẬN ĐƯỢC:', updateProductDto);
    return this.productsService.update(id, updateProductDto, file);
  }

  // 👇 THÊM ENDPOINT DELETE
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}