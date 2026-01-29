import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user;
  }

  async create(data: Prisma.UserCreateInput) {
    //hash password 
    const hashedPass = await bcrypt.hash(data.password, 10)
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPass,
        role: data.role ?? 'USER',
      }
    });
  }

  findAll() {
    return this.prisma.user.findMany();
  }
  update(id: number, data: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Xóa người dùng thành công', id };
  }
}
