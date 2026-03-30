import { BadRequestException, Body, Injectable, NotFoundException, Param, ParseIntPipe, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { FileInterceptor } from '@nestjs/platform-express';
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

    const autoSalary = data.position ? (SALARY_MAP[data.position] || 25000) : 25000;

    // 👇 LOGIC PHÂN QUYỀN TỰ ĐỘNG VÀ BẢO MẬT 👇
    let finalRole = data.role ?? 'USER'; // Mặc định là USER nếu không gửi gì

    // Nếu người tạo là MANAGER -> Ép cứng tài khoản mới phải là STAFF 
    // (Bỏ qua data.role họ gửi từ Frontend lên để tránh hack)
    if (creatorRole === 'MANAGER') {
      finalRole = 'STAFF';
    }

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPass,
        role: finalRole, // 👈 Gắn finalRole vào đây
        avatar: avatarUrl,
        hourlyRate: autoSalary, 
      }
    });
  }

  async findAll(
    page: number = 1, 
    perPage: number = 10,
    roleFilter?: string,     // 👈 Thêm tham số lọc chức vụ
    statusFilter?: string    // 👈 Thêm tham số lọc trạng thái
  ): Promise<PaginatedResult<any>> {
    
    // 1. Tạo điều kiện Where cơ bản (Mặc định lấy STAFF và MANAGER)
    const where: Prisma.UserWhereInput = {
      role: { in: ['STAFF', 'MANAGER'] },
    };

    // 2. Thêm điều kiện lọc Role (nếu có)
    // Giả sử Frontend truyền lên 'Store Manager' hoặc 'Barista'
    if (roleFilter) {
      where.position = roleFilter; 
    }

    // 3. Thêm điều kiện lọc Status (nếu có)
    // Giả sử Frontend truyền lên 'Active' hoặc 'Inactive'
    if (statusFilter) {
      where.status = statusFilter;
    }

    return paginate(
      this.prisma.user,
      {
        where, // 👈 Truyền cục Where đã được "nạp" điều kiện vào đây
        select: {
          id: true, email: true, name: true, role: true, createdAt: true,
          phoneNumber: true, address: true, avatar: true, status: true, position: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      },
      { page, perPage } 
    );
  }

  
  async update(id: number, updateUserDto: UpdateUserDto, file?: Express.Multer.File) {
    // 1. Chuẩn bị object data để update
    // Loại bỏ các field undefined/null để tránh Prisma update đè giá trị rỗng
    const dataToUpdate: any = { ...updateUserDto };
    // 2. Xử lý Avatar (Nếu có file mới)
    if (file) {
      try {
        // Truyền file và tên thư mục (VD: 'avatars')
        const uploadResult = await this.cloudinaryService.uploadImage(file, 'avatars');

        // Lấy đường dẫn URL an toàn trả về từ Cloudinary lưu vào DB
        dataToUpdate.avatar = uploadResult.secure_url;
      } catch (error) {
        throw new BadRequestException('Upload ảnh lên Cloudinary thất bại!');
      }
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

  async searchUsers(
    searchTerm: string, 
    page: number, 
    perPage: number,
    roleFilter?: string,    // 👈 Thêm tham số lọc chức vụ
    statusFilter?: string   // 👈 Thêm tham số lọc trạng thái
  ): Promise<PaginatedResult<any>> {
    
    // 1. Khai báo điều kiện tìm kiếm (Tên hoặc Email)
    const where: Prisma.UserWhereInput = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' as const } },
            { email: { contains: searchTerm, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // 2. Thêm điều kiện lọc Role (nếu có)
    if (roleFilter) {
      where.position = roleFilter;
    }

    // 3. Thêm điều kiện lọc Status (nếu có)
    if (statusFilter) {
      where.status = statusFilter;
    }

    return paginate(
      this.prisma.user,
      {
        where, // 👈 Truyền cục Where tổng hợp vào
        select: {
          id: true, name: true, email: true, avatar: true, position: true, 
          hourlyRate: true, status: true, // Nhớ lấy thêm status để trả về FE
        },
        orderBy: { name: 'asc' },
      },
      { page, perPage }
    );
  }
}
