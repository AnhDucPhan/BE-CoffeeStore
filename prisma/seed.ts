import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt'; // 👈 Import thêm thư viện mã hóa mật khẩu

const prisma = new PrismaClient();

async function main() {
    console.log('⏳ Đang bơm dữ liệu mẫu vào Database...');

    // ==========================================
    // 1. DỮ LIỆU MẪU: DANH MỤC (CATEGORIES)
    // ==========================================
    const categoriesData = [
        { name: 'Cà phê', description: 'Các loại hạt cà phê rang mộc' },
        { name: 'Sữa & Kem', description: 'Sữa đặc, sữa tươi, kem béo' },
        { name: 'Syrup & Sốt', description: 'Nguyên liệu tạo hương vị' },
        { name: 'Trà & Bột', description: 'Trà lá, trà túi lọc, bột matcha' },
        { name: 'Topping', description: 'Trân châu, thạch các loại' },
        { name: 'Bao bì', description: 'Ly nhựa, nắp, ống hút, túi T' },
    ];

    for (const cat of categoriesData) {
        await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: cat,
        });
    }

    const categories = await prisma.category.findMany();
    const getCatId = (name: string) => categories.find((c) => c.name === name)?.id || 1;

    // ==========================================
    // 2. DỮ LIỆU MẪU: NGUYÊN VẬT LIỆU (MATERIALS)
    // ==========================================
    const materialsData = [
        { name: 'Cà phê Robusta Mộc', code: 'NL-CP-01', unit: 'Kg', stock: 15.5, minStock: 3, costPrice: 120000, categoryId: getCatId('Cà phê'), isActive: true },
        { name: 'Cà phê Arabica', code: 'NL-CP-02', unit: 'Kg', stock: 5, minStock: 2, costPrice: 250000, categoryId: getCatId('Cà phê'), isActive: true },
        { name: 'Sữa đặc Ngôi Sao', code: 'NL-SU-01', unit: 'Lon', stock: 48, minStock: 12, costPrice: 22000, categoryId: getCatId('Sữa & Kem'), isActive: true },
        { name: 'Sữa tươi Đà Lạt Milk', code: 'NL-SU-02', unit: 'Hộp 1L', stock: 24, minStock: 6, costPrice: 38000, categoryId: getCatId('Sữa & Kem'), isActive: true },
        { name: 'Syrup Đào Monin', code: 'NL-SY-01', unit: 'Chai', stock: 6, minStock: 2, costPrice: 210000, categoryId: getCatId('Syrup & Sốt'), isActive: true },
        { name: 'Trà đen Lộc Phát', code: 'NL-TR-01', unit: 'Kg', stock: 10, minStock: 2, costPrice: 145000, categoryId: getCatId('Trà & Bột'), isActive: true },
        { name: 'Trân châu đen', code: 'NL-TP-01', unit: 'Kg', stock: 20, minStock: 5, costPrice: 35000, categoryId: getCatId('Topping'), isActive: true },
        { name: 'Ly nhựa PET 500ml', code: 'NL-BB-01', unit: 'Cái', stock: 2000, minStock: 500, costPrice: 850, categoryId: getCatId('Bao bì'), isActive: true },
    ];

    for (const mat of materialsData) {
        await prisma.material.upsert({
            where: { code: mat.code },
            update: {},
            create: mat,
        });
    }

    // ==========================================
    // 3. DỮ LIỆU MẪU: NHÂN VIÊN (USERS)
    // ==========================================
    console.log('⏳ Đang tạo dữ liệu Nhân viên...');
    const defaultPassword = await bcrypt.hash('123456', 10);

    const usersData = [
        {
            email: 'hoangbach.pham@gmail.com',
            name: 'Phạm Hoàng Bách',
            password: defaultPassword,
            role: 'MANAGER' as any,
            position: 'Store Manager', // 👈 Giữ nguyên
            hourlyRate: 50000,
            phoneNumber: '0938123456',
            address: '123 Phạm Văn Thuận, P. Tân Tiến, TP. Biên Hòa',
            status: 'Active',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BachPham',
        },
        {
            email: 'thaovy.nguyen99@gmail.com',
            name: 'Nguyễn Lê Thảo Vy',
            password: defaultPassword,
            role: 'STAFF' as any,
            position: 'Shift Manager', // 👈 Giữ nguyên
            hourlyRate: 35000,
            phoneNumber: '0987654321',
            address: '45 Nguyễn Ái Quốc, P. Tân Phong, TP. Biên Hòa',
            status: 'Active',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThaoVy',
        },
        {
            email: 'minhtuan.barista@gmail.com',
            name: 'Trần Minh Tuấn',
            password: defaultPassword,
            role: 'STAFF' as any,
            position: 'Senior Barista', // 👈 Giữ nguyên
            hourlyRate: 30000,
            phoneNumber: '0909112233',
            address: '78 Đồng Khởi, P. Tam Hiệp, TP. Biên Hòa',
            status: 'Active',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MinhTuan',
        },
        {
            email: 'ngochan.le@gmail.com',
            name: 'Lê Ngọc Hân',
            password: defaultPassword,
            role: 'STAFF' as any,
            position: 'Barista', // 👈 Giữ nguyên
            hourlyRate: 25000,
            phoneNumber: '0356889900',
            address: '12 Bùi Trọng Nghĩa, P. Trảng Dài, TP. Biên Hòa',
            status: 'Active',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NgocHan',
        },
        {
            email: 'dinhtrong.vu@gmail.com',
            name: 'Vũ Đình Trọng',
            password: defaultPassword,
            role: 'STAFF' as any,
            position: 'Barista', // 👈 Giữ nguyên
            hourlyRate: 22000,
            phoneNumber: '0773445566',
            address: 'KTX Đại học Đồng Nai, P. Tân Hiệp, TP. Biên Hòa',
            status: 'Inactive',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DinhTrong',
        },
    ];

    for (const user of usersData) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: user,
        });
    }

    console.log('✅ Seed toàn bộ dữ liệu mẫu (Danh mục, Kho, Nhân viên) thành công!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });