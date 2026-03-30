import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialsService } from './material.service';
// import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Mở comment này nếu bạn muốn bảo mật API bằng token

@Controller('materials')
// @UseGuards(JwtAuthGuard) // Nhớ bật cái này lên khi lắp vào app thật nhé
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  create(@Body() createMaterialDto: CreateMaterialDto) {
    return this.materialsService.create(createMaterialDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string, // 👈 Đổi thành categoryId
    @Query('status') status?: string,
  ) {
    const pageNumber = page ? Number(page) : 1;
    const itemsPerPage = perPage ? Number(perPage) : 10;
    
    return this.materialsService.findAll(pageNumber, itemsPerPage, q, categoryId, status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateMaterialDto: UpdateMaterialDto
  ) {
    return this.materialsService.update(id, updateMaterialDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.remove(id);
  }
}