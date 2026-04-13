import { PrismaClient } from '@prisma/client';

// Khởi tạo Prisma Client
const prisma = new PrismaClient();

// Hàm chuyển đổi tiếng Việt có dấu thành slug không dấu (VD: "Cà Phê Đen" -> "ca-phe-den")
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

  // ==========================================
  // 1. TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH
  // ==========================================
  const hashedPassword = '$2b$10$EPf9S6jXvWdZq8mO9bZ6u.X2U1G7iXwQY/2eT7oK3c/5A7zZ9Xj2a';

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cofybrew.com' },
    update: {}, 
    create: {
      email: 'admin@cofybrew.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'ADMIN', 
      phoneNumber: '0987654321', // 👈 ĐÃ THÊM TRƯỜNG PHONENUMBER
    },
  });
  console.log(`✅ Đã tạo Admin: ${admin.email} | Pass: 123456`);

  // ==========================================
  // 2. TẠO DANH SÁCH SẢN PHẨM MẪU (42 MÓN)
  // ==========================================
  const sampleProducts = [
    // --- 1. CÀ PHÊ TRUYỀN THỐNG (VIETNAMESE COFFEE) ---
    {
      name: 'Cà Phê Đen Đá',
      description: 'Cà phê Robusta nguyên chất pha phin, đậm đà, đắng thanh, chuẩn gu người Việt.',
      price: 29000,
      thumbnail: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cà Phê Sữa Đá',
      description: 'Sự kết hợp hoàn hảo giữa cà phê phin đậm đặc và sữa đặc ngọt ngào.',
      price: 35000,
      thumbnail: 'https://images.unsplash.com/photo-1558562805-4bf1e2a724eb?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Bạc Xỉu Sài Gòn',
      description: 'Nhiều sữa, ít cà phê, thơm béo chuẩn vị truyền thống nhẹ nhàng.',
      price: 39000,
      thumbnail: 'https://images.unsplash.com/photo-1538587888044-79f13ddd7e49?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Bạc Xỉu Cốt Dừa',
      description: 'Bạc xỉu mix cùng nước cốt dừa Bến Tre béo ngậy, thơm lừng.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1589396575653-c09c794f6d74?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cà Phê Muối',
      description: 'Lớp kem muối mặn mặn béo ngậy cân bằng vị đắng của cà phê.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1550461716-e5b121ab2c04?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cà Phê Trứng',
      description: 'Đặc sản Hà Nội với lớp kem trứng đánh bông mềm mịn, thơm không hề tanh.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1518057111178-44a106bad636?auto=format&fit=crop&w=500&q=80',
    },

    // --- 2. CÀ PHÊ PHA MÁY (ESPRESSO BASED) ---
    {
      name: 'Espresso Nguyên Bản',
      description: 'Chiết xuất 30ml cà phê tinh túy nhất từ hạt Arabica Cầu Đất.',
      price: 35000,
      thumbnail: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Americano (Đá/Nóng)',
      description: 'Espresso pha loãng với nước thanh khiết, giữ trọn hương vị nhẹ nhàng.',
      price: 39000,
      thumbnail: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Latte (Đá/Nóng)',
      description: 'Sự hòa quyện tuyệt vời giữa sữa tươi đánh nóng và một shot espresso.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cappuccino',
      description: 'Tương tự Latte nhưng với lớp bọt sữa dày và bồng bềnh hơn.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1534687941688-1bafbfbbfaec?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Mocha (Đá/Nóng)',
      description: 'Espresso mix cùng sốt chocolate ngọt ngào và sữa tươi béo ngậy.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1572442388796-11668aa44fbc?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Caramel Macchiato',
      description: 'Vị cà phê tinh tế đi kèm lớp bọt sữa và xốt caramel thơm lừng.',
      price: 55000,
      thumbnail: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Matcha Espresso',
      description: 'Sự phân tầng đẹp mắt giữa bột Matcha Nhật Bản và shot Espresso đắng.',
      price: 55000,
      thumbnail: 'https://images.unsplash.com/photo-1585573436329-87c12d26f0ce?auto=format&fit=crop&w=500&q=80',
    },

    // --- 3. COLD BREW (CÀ PHÊ Ủ LẠNH) ---
    {
      name: 'Cold Brew Truyền Thống',
      description: 'Cà phê Arabica ủ lạnh 24h, mượt mà, ít chua, vị thanh tao.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cold Brew Sữa Tươi',
      description: 'Cà phê ủ lạnh kết hợp cùng sữa tươi thanh trùng thanh mát.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cold Brew Cam Vàng',
      description: 'Hương vị sảng khoái với sự kết hợp của Cold Brew và nước ép cam tươi.',
      price: 55000,
      thumbnail: 'https://images.unsplash.com/photo-1513244274351-fb18c50fa89c?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cold Brew Tonic',
      description: 'Bùng nổ sảng khoái với nước Tonic có ga sủi bọt mát lạnh.',
      price: 55000,
      thumbnail: 'https://images.unsplash.com/photo-1620603704257-25e24bcfad4f?auto=format&fit=crop&w=500&q=80',
    },

    // --- 4. TRÀ TRÁI CÂY (FRUIT TEA) ---
    {
      name: 'Trà Đào Cam Sả',
      description: 'Thanh mát, giải nhiệt cực đã với đào miếng giòn rụm và sả thơm.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Trà Vải Nhiệt Đới',
      description: 'Trà Oolong thanh mát kết hợp cùng nhãn và vải thiều mọng nước.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Trà Dâu Tằm Macchiato',
      description: 'Nước cốt dâu tằm ngâm chua ngọt phủ lớp kem cheese béo ngậy.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1595981234058-a9302bf97386?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Trà Ổi Hồng Tiêu Đỏ',
      description: 'Trà lài mix mứt ổi hồng và một chút tiêu hồng độc đáo.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1610970881699-44a5587ce578?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Trà Chanh Dây Tuyết',
      description: 'Chua chua ngọt ngọt, đánh tan cái nóng mùa hè.',
      price: 39000,
      thumbnail: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Trà Xoài Lô Hội',
      description: 'Xoài tươi xay nhuyễn cùng topping lô hội giòn sần sật.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Trà Bưởi Mật Ong',
      description: 'Vị đắng nhẹ của bưởi hồng xoa dịu bởi mật ong rừng tự nhiên.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=80',
    },

    // --- 5. TRÀ SỮA (MILK TEA) ---
    {
      name: 'Trà Sữa Truyền Thống',
      description: 'Hương vị trà sữa đài loan thơm béo, đi kèm trân châu đen dai giòn.',
      price: 39000,
      thumbnail: 'https://images.unsplash.com/photo-1558855567-33f75249f3e4?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Trà Sữa Oolong Nướng',
      description: 'Trà Oolong đậm vị nướng sém kết hợp cùng sữa êm dịu.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Sữa Tươi Trân Châu Đường Đen',
      description: 'Sữa tươi thanh trùng Đà Lạt mix cùng xốt đường đen nghệ nhân.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1626082895617-2c6fd18b82af?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Trà Sữa Matcha',
      description: 'Matcha Uji Nhật Bản đậm đà pha cùng sữa tươi thanh khiết.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?auto=format&fit=crop&w=500&q=80',
    },

    // --- 6. ĐÁ XAY (FRAPPE) ---
    {
      name: 'Matcha Đá Xay',
      description: 'Bột matcha xay cùng đá viên, phủ kem whipping mềm mịn.',
      price: 55000,
      thumbnail: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cookies Cream Đá Xay',
      description: 'Bánh Oreo nghiền nhuyễn xay cùng sữa tươi và đá.',
      price: 55000,
      thumbnail: 'https://images.unsplash.com/photo-1572490122747-3968b75bf699?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Chocolate Đá Xay',
      description: 'Socola đậm đặc béo ngậy, thức uống yêu thích của tín đồ hảo ngọt.',
      price: 55000,
      thumbnail: 'https://images.unsplash.com/photo-1528750821033-0c1fc82d56a0?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cà Phê Đá Xay Cốt Dừa',
      description: 'Espresso xay nhuyễn cùng nước cốt dừa tạo nên kết cấu xốp mịn như tuyết.',
      price: 59000,
      thumbnail: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=500&q=80',
    },

    // --- 7. NƯỚC ÉP & THỨC UỐNG KHÁC ---
    {
      name: 'Nước Ép Cam Tươi',
      description: 'Ép nguyên chất 100% từ cam sành tươi mọng nước, giàu Vitamin C.',
      price: 39000,
      thumbnail: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Nước Ép Dưa Hấu',
      description: 'Thơm mát, ngọt thanh tự nhiên không thêm đường.',
      price: 35000,
      thumbnail: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Chanh Tuyết Đào',
      description: 'Chanh tươi xay đá tuyết mát lạnh, kết hợp thạch đào.',
      price: 39000,
      thumbnail: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cacao Nóng Marshmallow',
      description: 'Cacao đặc nguyên chất dùng kèm kẹo dẻo Marshmallow tan chảy.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Sữa Chua Trái Cây Hạt Granola',
      description: 'Sữa chua không đường ăn kèm trái cây tươi và hạt dinh dưỡng.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=500&q=80',
    },

    // --- 8. BÁNH NGỌT (PASTRIES) ---
    {
      name: 'Bánh Sừng Bò Bơ Pháp (Croissant)',
      description: 'Bánh nướng mới mỗi ngày, ngàn lớp xốp giòn, thơm lừng mùi bơ.',
      price: 35000,
      thumbnail: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Tiramisu Cổ Điển',
      description: 'Cốt bánh ladyfinger tẩm cà phê và rượu Rhum, phủ kem mascarpone béo ngậy.',
      price: 49000,
      thumbnail: 'https://images.unsplash.com/photo-1571115177098-24de43058a98?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Bánh Phô Mai Nướng (Basque)',
      description: 'Lớp mặt nướng cháy xém caramen, nhân phô mai béo ngậy tan chảy.',
      price: 55000,
      thumbnail: 'https://images.unsplash.com/photo-1605335198947-f3277085a6b7?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Cookie Socola Đen',
      description: 'Bánh quy nướng giòn rụm với những hạt choco-chip nguyên chất.',
      price: 25000,
      thumbnail: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Bánh Mì Phô Mai Bơ Tỏi',
      description: 'Bánh mì nướng sốt bơ tỏi thơm nức mũi, nhân phô mai kem chua ngọt.',
      price: 45000,
      thumbnail: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=500&q=80',
    }
  ];

  console.log('Đang tạo sản phẩm...');
  for (const p of sampleProducts) {
    // 👇 ĐÃ THÊM AUTO TẠO SLUG VÀO ĐÂY
    const productSlug = createSlug(p.name);

    await prisma.product.create({
      data: {
        ...p,
        slug: productSlug, // Bơm slug vào database
      },
    });
  }
  console.log(`✅ Đã tạo thành công ${sampleProducts.length} sản phẩm mẫu!`);

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