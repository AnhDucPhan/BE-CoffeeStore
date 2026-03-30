import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/add-to-categories.dto';

@Controller('categories') // 👈 QUAN TRỌNG: Phải có chữ 's' ở đây để khớp với API của Frontend
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get() // 👈 QUAN TRỌNG: Bắt buộc phải có cổng @Get() này để FE lấy data
  findAll() {
    return this.categoriesService.findAll();
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}