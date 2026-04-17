import { BadRequestException, Body, Injectable, NotFoundException, Param, ParseIntPipe, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PaginatedResult, paginator } from 'src/common/helpers/paginator';

const SALARY_MAP: Record<string, number> = {
  "Store Manager": 45000,
  "Shift Manager": 35000,
  "Senior Barista": 30000,
  "Barista": 25000,
}

const paginate = paginator({ perPage: 10 });

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

  // ====================================================================
  // 1. TẠO TÀI KHOẢN (Bỏ qua xác thực nếu là Admin/Manager tạo)
  // ====================================================================
  async create(data: Prisma.UserCreateInput, file?: Express.Multer.File, creatorRole?: string) {
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) {
      throw new BadRequestException('Email đã tồn tại');
    }
    
    let avatarUrl = data.avatar;

    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'users');
      avatarUrl = result.secure_url;
    }

    const hashedPass = await bcrypt.hash(data.password, 10);
    const autoSalary = data.position ? (SALARY_MAP[data.position as string] || 25000) : 25000;

    let finalRole = data.role ?? 'USER'; 

    // 👇 1. NHẬN DIỆN NGƯỜI TẠO TÀI KHOẢN
    const isCreatedByAdminOrManager = creatorRole === 'MANAGER' || creatorRole === 'ADMIN';

    // Manager thì chỉ được phép tạo Staff (để chống hack leo quyền)
    if (creatorRole === 'MANAGER') {
      finalRole = 'STAFF';
    }

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPass,
        role: finalRole, 
        avatar: avatarUrl,
        hourlyRate: autoSalary, 
        
        // 👇 2. LOGIC BỎ QUA XÁC THỰC
        // Nếu là Admin hoặc Manager tạo -> Mở khóa đăng nhập luôn (true)
        // Nếu không có quyền (tự đăng ký) -> Bắt xác thực (false)
        isEmailVerified: isCreatedByAdminOrManager ? true : false, 
      }
    });
  }

  async findAll(
    page: number = 1, 
    perPage: number = 10,
    roleFilter?: string,    
    statusFilter?: string   
  ): Promise<PaginatedResult<any>> {
    
    const where: Prisma.UserWhereInput = {
      role: { in: ['STAFF', 'MANAGER'] },
    };

    if (roleFilter) {
      where.position = roleFilter; 
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    return paginate(
      this.prisma.user,
      {
        where, 
        select: {
          id: true, email: true, name: true, role: true, createdAt: true,
          phoneNumber: true, address: true, avatar: true, status: true, position: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      },
      { page, perPage } 
    );
  }

  // ====================================================================
  // 2. CẬP NHẬT TÀI KHOẢN (Đã fix lỗi cập nhật lương)
  // ====================================================================
  async update(id: number, updateUserDto: UpdateUserDto, file?: Express.Multer.File) {
    const dataToUpdate: any = { ...updateUserDto };
    
    if (file) {
      try {
        const uploadResult = await this.cloudinaryService.uploadImage(file, 'avatars');
        dataToUpdate.avatar = uploadResult.secure_url;
      } catch (error) {
        throw new BadRequestException('Upload ảnh lên Cloudinary thất bại!');
      }
    }
    
    if (dataToUpdate.password) {
      const salt = await bcrypt.genSalt();
      dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, salt);
    } else {
      delete dataToUpdate.password;
    }

    // 👇 FIX MỚI: Tự động cập nhật lại lương nếu Admin thay đổi chức vụ (position)
    if (dataToUpdate.position) {
      dataToUpdate.hourlyRate = SALARY_MAP[dataToUpdate.position] || 25000;
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id }, 
        data: dataToUpdate,
      });

      const { password, ...result } = updatedUser;
      return result;

    } catch (error : any) {
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

    const { password, ...result } = user;
    return result;
  }

  async searchUsers(
    searchTerm: string, 
    page: number, 
    perPage: number,
    roleFilter?: string,    
    statusFilter?: string  
  ): Promise<PaginatedResult<any>> {
    
    const where: Prisma.UserWhereInput = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' as const } },
            { email: { contains: searchTerm, mode: 'insensitive' as const } },
          ],
        }
      : {};

    if (roleFilter) {
      where.position = roleFilter;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    return paginate(
      this.prisma.user,
      {
        where,
        select: {
          id: true, name: true, email: true, avatar: true, position: true, 
          hourlyRate: true, status: true,
        },
        orderBy: { name: 'asc' },
      },
      { page, perPage }
    );
  }
}