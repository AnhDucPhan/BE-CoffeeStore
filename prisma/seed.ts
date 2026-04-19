import { PrismaClient, Role } from '@prisma/client'; // 👈 THÊM CHỮ Role VÀO ĐÂY
import * as bcrypt from 'bcrypt';

// Khởi tạo Prisma Client
const prisma = new PrismaClient();

// Hàm chuyển đổi tiếng Việt có dấu thành slug không dấu (Dùng cho Category)
function createSlug(str: string) {
  str = str.replace(/A|Á|À|Ã|Ạ|Â|Ấ|Ầ|Ẫ|Ậ|Ă|Ắ|Ằ|Ẵ|Ặ/g, "A");
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/E|É|È|Ẽ|Ẹ|Ê|Ế|Ề|Ễ|Ệ/g, "E");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/I|Í|Ì|Ĩ|Ị/g, "I");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/O|Ó|Ò|Õ|Ọ|Ô|Ố|Ồ|Ỗ|Ộ|Ơ|Ớ|Ờ|Ỡ|Ợ/g, "O");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/U|Ú|Ù|Ũ|Ụ|Ư|Ứ|Ừ|Ữ|Ự/g, "U");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/Y|Ý|Ỳ|Ỹ|Ỵ/g, "Y");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/Đ/g, "D");
  str = str.replace(/đ/g, "d");
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); 
  str = str.replace(/\u02C6|\u0306|\u031B/g, ""); 
  str = str.toLowerCase();
  str = str.replace(/[^a-z0-9]/g, '-');
  str = str.replace(/-+/g, '-');
  str = str.replace(/^-+|-+$/g, '');
  return str;
}

async function main() {
  console.log('Bắt đầu bơm dữ liệu (Seeding)... 🌱');

  // Mật khẩu chung "123456" đã được mã hóa
  const hashedPassword = await bcrypt.hash('123456', 10);

  // ==========================================
  // 1. TẠO TÀI KHOẢN NGƯỜI DÙNG (USERS)
  // ==========================================
  console.log('Đang tạo Users...');
  const users = [
    { 
      email: 'admin@cofybrew.com', 
      name: 'Super Admin', 
      role: Role.ADMIN, 
      phoneNumber: '0987654321', 
      isEmailVerified: true,
      status: 'Active'
    },
    { 
      email: 'manager@cofybrew.com', 
      name: 'Trần Quản Lý', 
      role: Role.MANAGER, 
      phoneNumber: '0912345678', 
      position: 'Cửa hàng trưởng', 
      hourlyRate: 50000, 
      isEmailVerified: true,
      status: 'Active'
    },
    { 
      email: 'barista1@cofybrew.com', 
      name: 'Lê Barista', 
      role: Role.STAFF, 
      phoneNumber: '0933334444', 
      position: 'Barista', 
      hourlyRate: 25000, // Có thể bỏ trống vì đã có @default(25000) dưới DB
      isEmailVerified: true,
      status: 'Active'
    },
    { 
      email: 'cashier@cofybrew.com', 
      name: 'Nguyễn Thu Ngân', 
      role: Role.STAFF, 
      phoneNumber: '0944445555', 
      position: 'Thu ngân', 
      hourlyRate: 22000, 
      isEmailVerified: true,
      status: 'Active'
    },
    { 
      email: 'khachhang1@gmail.com', 
      name: 'Khách VIP 1', 
      role: Role.USER, 
      phoneNumber: '0988889999', 
      isEmailVerified: true,
      status: 'Active'
      // Đã xoá rewardPoints để khớp với schema mới
    }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {}, 
      create: { ...u, password: hashedPassword },
    });
  }
  console.log(`✅ Đã tạo ${users.length} tài khoản User!`);

  // ==========================================
  // 2. TẠO DANH MỤC (CATEGORIES) - Bắt buộc để map với Material
  // ==========================================
  console.log('Đang tạo Categories...');
  const categoryNames = ['Cà Phê', 'Trà', 'Sữa & Kem', 'Sirup & Mứt', 'Bao Bì & Ly Nhựa'];
  const createdCategories = [];

  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name: name },
      update: {},
      create: { name: name},
    });
    createdCategories.push(cat);
  }
  console.log(`✅ Đã tạo ${createdCategories.length} danh mục nguyên liệu!`);

  // ==========================================
  // 3. TẠO NGUYÊN VẬT LIỆU (MATERIALS)
  // ==========================================
  console.log('Đang tạo Nguyên vật liệu...');
  
  // Ánh xạ ID danh mục để gán vào cột categoryId của Material
  const catCoffeeId = createdCategories.find(c => c.name === 'Cà Phê')?.id || 1;
  const catMilkId = createdCategories.find(c => c.name === 'Sữa & Kem')?.id || 1;
  const catPackagingId = createdCategories.find(c => c.name === 'Bao Bì & Ly Nhựa')?.id || 1;

  const sampleMaterials = [
    { name: 'Hạt Cà phê Robusta Nguyên Chất', code: 'MAT-CF-001', unit: 'kg', stock: 50, minStock: 10, costPrice: 120000, supplier: 'Nông Trại Cầu Đất', categoryId: catCoffeeId },
    { name: 'Hạt Cà phê Arabica Loại 1', code: 'MAT-CF-002', unit: 'kg', stock: 20, minStock: 5, costPrice: 250000, supplier: 'Nông Trại Cầu Đất', categoryId: catCoffeeId },
    { name: 'Sữa Tươi Thanh Trùng Dalat Milk', code: 'MAT-MILK-001', unit: 'Lít', stock: 40, minStock: 10, costPrice: 35000, supplier: 'Dalat Milk', categoryId: catMilkId },
    { name: 'Sữa Đặc Ngôi Sao Phương Nam', code: 'MAT-MILK-002', unit: 'Lon', stock: 100, minStock: 20, costPrice: 22000, supplier: 'Vinamilk', categoryId: catMilkId },
    { name: 'Ly Nhựa PET 500ml', code: 'MAT-PKG-001', unit: 'Cái', stock: 2000, minStock: 500, costPrice: 800, supplier: 'Nhựa Tân Phú', categoryId: catPackagingId },
    { name: 'Ống Hút Giấy', code: 'MAT-PKG-002', unit: 'Cái', stock: 5000, minStock: 1000, costPrice: 300, supplier: 'Eco Straws', categoryId: catPackagingId },
  ];

  for (const mat of sampleMaterials) {
    await prisma.material.upsert({
      where: { code: mat.code },
      update: {},
      create: mat,
    });
  }
  console.log(`✅ Đã tạo ${sampleMaterials.length} nguyên vật liệu kho!`);

  console.log('Hoàn tất bơm dữ liệu! 🚀');
}

main()
  .catch((e) => {
    console.error('Lỗi khi chạy seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });