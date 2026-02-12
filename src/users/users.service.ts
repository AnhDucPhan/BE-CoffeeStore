import { BadRequestException, Body, Injectable, NotFoundException, Param, ParseIntPipe, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    return user;
  }

  async create(data: Prisma.UserCreateInput, file?: Express.Multer.File) {
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) {
      throw new BadRequestException('Email đã tồn tại');
    }
    let avatarUrl = data.avatar;

    if (file) {
      // 👇 Truyền 'users' để ảnh chui vào folder users trên Cloudinary
      const result = await this.cloudinaryService.uploadImage(file, 'users');
      avatarUrl = result.secure_url;
    }

    const hashedPass = await bcrypt.hash(data.password, 10)
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPass,
        role: data.role ?? 'USER',
        avatar: avatarUrl,
      }
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        phoneNumber: true,
        address: true,
        avatar: true,
        status: true,
      },
    });
  }
  async update(id: number, updateUserDto: UpdateUserDto, file?: Express.Multer.File) {
    // 1. Chuẩn bị object data để update
    // Loại bỏ các field undefined/null để tránh Prisma update đè giá trị rỗng
    const dataToUpdate: any = { ...updateUserDto };
    // 2. Xử lý Avatar (Nếu có file mới)
    if (file) {
      // Lưu đường dẫn file hoặc tên file tùy cấu hình Multer của bạn
      dataToUpdate.avatar = file.filename;
    }
    // 3. Xử lý Password (Nếu có gửi password mới lên)
    if (dataToUpdate.password) {
      const salt = await bcrypt.genSalt();
      dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, salt);
    } else {
      // Nếu không gửi password -> Xóa key này đi để không bị update thành chuỗi rỗng
      delete dataToUpdate.password;
    }

    try {
      // 4. Gọi Prisma để update
      const updatedUser = await this.prisma.user.update({
        where: { id }, // Tìm theo ID
        data: dataToUpdate,
      });

      const { password, ...result } = updatedUser;
      return result;

    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User với ID ${id} không tồn tại`);
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Email hoặc Số điện thoại đã tồn tại');
      }
      throw error;
    }
  }

  async delete(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Xóa người dùng thành công', id };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy User có ID: ${id}`);
    }

    // Loại bỏ password cho an toàn
    const { password, ...result } = user;
    return result;
  }
}
