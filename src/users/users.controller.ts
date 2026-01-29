import { Body, Controller, Post, Get, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    @Post()
    create(@Body() body: CreateUserDto) {
        return this.usersService.create(body);
    }

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: UpdateUserDto) {
        return this.usersService.update(+id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa người dùng theo ID' })
    @ApiParam({ name: 'id', description: 'ID người dùng cần xóa', example: 1 })
    @ApiResponse({ status: 200, description: 'Xóa người dùng thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
    async delete(@Param('id') id: string) {
        return this.usersService.delete(+id); // convert sang number
    }
}
