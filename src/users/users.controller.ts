import { Body, Controller, Post, Get, Patch, Param, Delete, UseInterceptors, ParseIntPipe, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    @UseInterceptors(FileInterceptor('avatar'))
    @Post()
    create(@Body() body: CreateUserDto) {
        return this.usersService.create(body);
    }

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

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

    // src/users/users.controller.ts



    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }
}
