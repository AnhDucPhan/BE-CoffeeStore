import { Body, Controller, Post, Get, Patch, Param, Delete, UseInterceptors, ParseIntPipe, UploadedFile, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @UseInterceptors(FileInterceptor('avatar'))
    async create(
        @Body() createUserDto: CreateUserDto,
        @Request() req: any,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        // Truyền thêm req.user.role xuống tham số thứ 3 của hàm create
        return this.usersService.create(createUserDto, file, req.user?.role);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll(
        @Query('page') page?: string,
        @Query('perPage') perPage?: string,
        @Query('role') role?: string,     // 👈 Hứng role
        @Query('status') status?: string, // 👈 Hứng status
    ) {
        const pageNumber = page ? Number(page) : 1;
        const itemsPerPage = perPage ? Number(perPage) : 10;

        // Truyền đúng 4 tham số: page, perPage, role, status
        return this.usersService.findAll(pageNumber, itemsPerPage, role, status);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @UseInterceptors(FileInterceptor('avatar')) // Nhận key 'avatar' từ FormData
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserDto: UpdateUserDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        console.log("1. DTO (Text):", updateUserDto);
        console.log("2. File (Image):", file);
        return this.usersService.update(id, updateUserDto, file);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Xóa người dùng theo ID' })
    @ApiParam({ name: 'id', description: 'ID người dùng cần xóa', example: 1 })
    @ApiResponse({ status: 200, description: 'Xóa người dùng thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
    // 👇 Thay đổi ở dòng này
    async delete(@Param('id', ParseIntPipe) id: number) {
        // Lúc này id đã chắc chắn là số (number), không cần dấu + nữa
        return this.usersService.delete(id);
    }

    @Get('search')
    async searchUsers(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('perPage') perPage?: string,
        @Query('role') role?: string,     // 👈 Hứng role
        @Query('status') status?: string, // 👈 Hứng status
    ) {
        const pageNumber = page ? Number(page) : 1;
        const perPageNumber = perPage ? Number(perPage) : 10;
        const searchTerm = q || '';

        // Truyền đúng 5 tham số: searchTerm, page, perPage, role, status
        return this.usersService.searchUsers(searchTerm, pageNumber, perPageNumber, role, status);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }


}
