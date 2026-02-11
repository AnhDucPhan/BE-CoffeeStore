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
}