const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Read .env file to get DIRECT_URL or DATABASE_URL
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at ' + envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
let connectionUri = '';

envContent.split(/\r?\n/).forEach(line => {
  const directMatch = line.match(/^\s*DIRECT_URL\s*=\s*["']?(.*?)["']?\s*$/);
  if (directMatch) {
    connectionUri = directMatch[1];
  }
  if (!connectionUri) {
    const dbMatch = line.match(/^\s*DATABASE_URL\s*=\s*["']?(.*?)["']?\s*$/);
    if (dbMatch) {
      connectionUri = dbMatch[1];
    }
  }
});

if (!connectionUri) {
  console.error('Error: DIRECT_URL or DATABASE_URL not found in .env');
  process.exit(1);
}

// Parse connection URL
const myUrl = new URL(connectionUri);
const user = decodeURIComponent(myUrl.username);
const password = decodeURIComponent(myUrl.password);
const host = myUrl.hostname;
const port = myUrl.port ? parseInt(myUrl.port, 10) : 5432;
const database = myUrl.pathname.slice(1);

console.log(`Connecting to Host=${host}, Port=${port}, DB=${database}, User=${user}`);

const client = new Client({
  user,
  password,
  host,
  port,
  database,
  ssl: {
    rejectUnauthorized: false
  }
});

const shops = ['quan', 'quan-test'];

const categories = [
  { name: 'Rau Củ Quả Đà Lạt', sort_order: 0 },
  { name: 'Hoa Tươi', sort_order: 1 },
  { name: 'Trái Cây Nhập Khẩu', sort_order: 2 },
  { name: 'Bánh Kẹo & Hạt Organic', sort_order: 3 },
  { name: 'Đồ Sấy & Đặc Sản Đà Lạt', sort_order: 4 }
];

const products = [
  // Category: Rau Củ Quả Đà Lạt
  { name: 'Bắp non ngọt', category: 'Rau Củ Quả Đà Lạt', sub: 'Rau củ', price: 25000, img: '/product-images/bap_non.jpg', desc: 'Bắp non tươi ngon, ngọt tự nhiên, thích hợp xào hoặc nấu lẩu.' },
  { name: 'Cải cầu vồng Đà Lạt', category: 'Rau Củ Quả Đà Lạt', sub: 'Rau lá', price: 35000, img: '/product-images/cai_cau_vong.jpg', desc: 'Cải cầu vồng nhiều màu sắc, giàu dinh dưỡng, trồng organic tại Đà Lạt.' },
  { name: 'Củ cải đỏ tròn', category: 'Rau Củ Quả Đà Lạt', sub: 'Rau củ', price: 30000, img: '/product-images/cu_cai_do_tron.jpg', desc: 'Củ cải đỏ giòn ngọt, giàu vitamin, dùng làm salad hoặc muối chua.' },
  { name: 'Súp lơ baby Đà Lạt', category: 'Rau Củ Quả Đà Lạt', sub: 'Rau củ', price: 40000, img: '/product-images/lo_baby_nhanh.jpg', desc: 'Súp lơ baby giòn ngọt, giàu chất xơ, đạt tiêu chuẩn VietGAP.' },
  { name: 'Nấm đông cô tươi', category: 'Rau Củ Quả Đà Lạt', sub: 'Nấm & Khác', price: 55000, img: '/product-images/nam_dong_co_tuoi.jpg', desc: 'Nấm đông cô tươi ngon, dai giòn, tốt cho sức khỏe.' },
  { name: 'Rau rừng Tây Nguyên', category: 'Rau Củ Quả Đà Lạt', sub: 'Rau lá', price: 45000, img: '/product-images/rau_rung.jpg', desc: 'Rau rừng tự nhiên, hương vị đặc trưng, giàu dưỡng chất.' },
  { name: 'Su su baby Đà Lạt', category: 'Rau Củ Quả Đà Lạt', sub: 'Rau củ', price: 28000, img: '/product-images/su_baby.jpg', desc: 'Su su baby giòn, ngọt lịm, dùng xào tỏi hoặc luộc chấm kho quẹt.' },
  { name: 'Tỏi cô đơn Phan Rang', category: 'Rau Củ Quả Đà Lạt', sub: 'Nấm & Khác', price: 150000, img: '/product-images/to_co_don.jpg', desc: 'Tỏi cô đơn nhiều dược tính, thơm nồng, gia vị quý cho sức khỏe.' },
  { name: 'Hành tím hành tráng', category: 'Rau Củ Quả Đà Lạt', sub: 'Nấm & Khác', price: 35000, img: '/product-images/hanh_tim_hanh_trang.jpg', desc: 'Hành tím thơm ngon, củ chắc, gia vị không thể thiếu.' },
  { name: 'Khoai lang Nhật Đà Lạt', category: 'Rau Củ Quả Đà Lạt', sub: 'Rau củ', price: 30000, img: '/product-images/khoai_lang.jpg', desc: 'Khoai lang Nhật ruột vàng, ngọt bùi, giàu tinh bột tốt.' },
  { name: 'Khoai lang mật Đà Lạt', category: 'Rau Củ Quả Đà Lạt', sub: 'Rau củ', price: 35000, img: '/product-images/khoai_lang_2.jpg', desc: 'Khoai lang mật nướng chảy mật ngọt lịm, thơm phức.' },

  // Category: Hoa Tươi
  { name: 'Hoa Cẩm Tú Cầu cành', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 45000, img: '/product-images/cam_tu_cau_canh.jpg', desc: 'Hoa cẩm tú cầu Đà Lạt đóa to, màu xanh lam/hồng pastel nhẹ nhàng.' },
  { name: 'Địa lan cành VIP', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 350000, img: '/product-images/dia_lan_canh_vip.jpg', desc: 'Cành địa lan VIP sang trọng, độ bền cao, thích hợp chưng tết/quà tặng.' },
  { name: 'Hoa cúc Farm Đà Lạt', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 30000, img: '/product-images/hoa_cuc_farm.jpg', desc: 'Hoa cúc nhiều màu sắc rực rỡ, thích hợp cắm bình trang trí nhà cửa.' },
  { name: 'Hoa dơn lúa đỏ', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 80000, img: '/product-images/hoa_don_lua.jpg', desc: 'Hoa dơn lúa (gladiolus) màu cam đỏ rực rỡ, mang lại may mắn.' },
  { name: 'Hoa hướng dương VIP', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 50000, img: '/product-images/hoa_huong_duong.jpg', desc: 'Hoa hướng dương đóa to hướng về mặt trời, biểu tượng của hy vọng.' },
  { name: 'Hoa ly trắng viền hồng', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 150000, img: '/product-images/hoa_ly_trang_vien_den.jpg', desc: 'Hoa ly trắng viền hồng thơm ngát, cánh hoa dày và bền.' },
  { name: 'Hoa hồng Juliet Đà Lạt', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 95000, img: '/product-images/hong_may_juiu_dat_lat.jpg', desc: 'Bó hoa hồng ngoại Juliet màu cam cá hồi sang trọng, xếp cánh tinh tế.' },
  { name: 'Lan vũ nữ vàng VIP', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 180000, img: '/product-images/lang_u_vang_vip.jpg', desc: 'Cành lan vũ nữ vàng rực rỡ như những vũ công nhảy múa.' },
  { name: 'Hoa pháo đỏ cam', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 65000, img: '/product-images/phao_do_cam.jpg', desc: 'Nhánh hoa pháo đỏ cam độc đáo, thích hợp cắm bình nghệ thuật.' },
  { name: 'Hoa pháo đông Farm', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 70000, img: '/product-images/phao_dong_farm.jpg', desc: 'Hoa pháo đông tươi tắn từ nông trại Đà Lạt.' },
  { name: 'Hoa pháo hồng Farm', category: 'Hoa Tươi', sub: 'Hoa cắt cành', price: 70000, img: '/product-images/phao_hong_fram.jpg', desc: 'Hoa pháo hồng dịu dàng, trang trí không gian ấm cúng.' },
  { name: 'Cam kiểng bonsai', category: 'Hoa Tươi', sub: 'Phụ kiện hoa', price: 150000, img: '/product-images/cam_kieng.jpg', desc: 'Chậu cam kiểng trĩu quả thích hợp trưng bày phòng khách.' },

  // Category: Trái Cây Nhập Khẩu
  { name: 'Bơ sáp 034 Đắk Lắk', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 65000, img: '/product-images/Bo_khong_ten.jpg', desc: 'Bơ 034 cơm vàng hạt lép, dẻo béo, thơm ngon đặc sản Tây Nguyên.' },
  { name: 'Dâu tây Bạch Tuyết', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây Nhật/Hàn', price: 280000, img: '/product-images/Dau_Bach_tuyet.jpg', desc: 'Dâu tây trắng Bạch Tuyết thơm mùi dứa, ngọt thanh, cực kỳ quý hiếm.' },
  { name: 'Dứa mật MD2', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 35000, img: '/product-images/Dua_MD2.jpg', desc: 'Dứa mật MD2 ngọt lịm nhiều nước, không bị rát lưỡi khi ăn.' },
  { name: 'Mận hồng MST', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 85000, img: '/product-images/Man_hong_MST.jpg', desc: 'Mận hồng MST giòn ngọt, mọng nước, ăn kèm muối ớt cực ngon.' },
  { name: 'Cam đường canh', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 45000, img: '/product-images/cam_duong.jpg', desc: 'Cam đường canh vỏ mỏng, mọng nước, vị ngọt đậm đà.' },
  { name: 'Chanh vàng Mỹ', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây Mỹ/Úc', price: 75000, img: '/product-images/chang_my_vang.jpg', desc: 'Chanh vàng Mỹ nhập khẩu quả to, thơm nồng, vỏ mỏng nhiều nước.' },
  { name: 'Chuối Laba Đà Lạt', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 25000, img: '/product-images/chuoi_laba_da_lat.jpg', desc: 'Chuối Laba tiến vua thơm dẻo, ngọt thanh đặc sản Lâm Đồng.' },
  { name: 'Dứa Queen Nghệ An', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 20000, img: '/product-images/dua_qeen_nghe_an.jpg', desc: 'Dứa Queen quả nhỏ nhưng ngọt đậm đà, giòn thơm.' },
  { name: 'Kiwi vàng Zespri', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây Mỹ/Úc', price: 140000, img: '/product-images/kiwi_vang.jpg', desc: 'Kiwi vàng Zespri New Zealand ngọt lịm, giàu vitamin C và chất xơ.' },
  { name: 'Mâm xôi đen organic', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 160000, img: '/product-images/mam_xoi_den.jpg', desc: 'Quả mâm xôi đen (Blackberry) tươi ngon, giàu chất chống oxy hóa.' },
  { name: 'Mâm xôi đỏ organic', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 150000, img: '/product-images/mam_xoi_do.jpg', desc: 'Quả mâm xôi đỏ (Raspberry) vị chua ngọt nhẹ, thơm dịu.' },
  { name: 'Măng cụt Thái siêu ngọt', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây Nam Phi', price: 90000, img: '/product-images/mang_cut_thai_thieu.jpg', desc: 'Măng cụt Thái chín tự nhiên, cơm trắng ngần ngọt thanh.' },
  { name: 'Quýt chum Úc', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây Mỹ/Úc', price: 120000, img: '/product-images/quyt_chum.jpg', desc: 'Quýt chum vỏ mỏng dễ bóc, vị ngọt đậm đà và mọng nước.' },
  { name: 'Quýt Citrus VIP', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây Mỹ/Úc', price: 160000, img: '/product-images/quyt_citrus_6phvip.jpg', desc: 'Quýt Citrus thượng hạng nhập khẩu, vị ngọt lịm không hạt.' },
  { name: 'Quýt xiêm miền Tây', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 40000, img: '/product-images/quyt_xiem.jpg', desc: 'Quýt xiêm mọng nước ngọt thanh, đặc sản Đồng Tháp.' },
  { name: 'Sầu riêng Ri6 cơm vàng', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 130000, img: '/product-images/sau_rieng_thai.jpg', desc: 'Sầu riêng Ri6 cơm vàng hạt lép, béo ngậy ngọt đậm đà.' },
  { name: 'Thơm mật Lâm Đồng', category: 'Trái Cây Nhập Khẩu', sub: 'Trái cây nội địa', price: 30000, img: '/product-images/thom_mat.jpg', desc: 'Thơm mật ngọt nhiều nước, rất tốt cho sức khỏe và giảm cân.' },

  // Category: Bánh Kẹo & Hạt Organic
  { name: 'Hạt bông gạo khô', category: 'Bánh Kẹo & Hạt Organic', sub: 'Hạt dinh dưỡng', price: 75000, img: '/product-images/bong_gao.jpg', desc: 'Hạt bông gạo sấy giòn thơm bùi, ăn vặt siêu cuốn.' },
  { name: 'Hạt hạnh nhân sấy chín', category: 'Bánh Kẹo & Hạt Organic', sub: 'Hạt dinh dưỡng', price: 55000, img: '', desc: 'Hạt hạnh nhân Mỹ sấy nguyên vị, giòn ngon.' },
  { name: 'Hạt macca nứt vỏ', category: 'Bánh Kẹo & Hạt Organic', sub: 'Hạt dinh dưỡng', price: 85000, img: '', desc: 'Hạt macca Lâm Đồng giàu dinh dưỡng, kèm dụng cụ tách vỏ.' },
  { name: 'Hạt điều rang củi', category: 'Bánh Kẹo & Hạt Organic', sub: 'Hạt dinh dưỡng', price: 65000, img: '', desc: 'Hạt điều rang củi Bình Phước giòn bùi thơm ngậy.' },

  // Category: Đồ Sấy & Đặc Sản Đà Lạt
  { name: 'Hồng treo gió Đà Lạt', category: 'Đồ Sấy & Đặc Sản Đà Lạt', sub: 'Trái cây sấy dẻo', price: 180000, img: '', desc: 'Hồng treo gió công nghệ Nhật Bản ngon ngọt dẻo thơm.' },
  { name: 'Khoai lang sấy dẻo', category: 'Đồ Sấy & Đặc Sản Đà Lạt', sub: 'Trái cây sấy dẻo', price: 45000, img: '', desc: 'Khoai lang sấy dẻo tự nhiên không thêm đường.' },
  { name: 'Trà Atiso túi lọc', category: 'Đồ Sấy & Đặc Sản Đà Lạt', sub: 'Trà & Cà phê', price: 60000, img: '', desc: 'Trà atiso nguyên chất giải độc mát gan thanh lọc cơ thể.' }
];

async function seed() {
  try {
    await client.connect();
    console.log('Connected! Beginning transaction...');
    await client.query('BEGIN');

    // Delete existing categories and items
    console.log('Clearing old categories and menu items...');
    await client.query("DELETE FROM menu_items WHERE shop_slug = ANY($1)", [shops]);
    await client.query("DELETE FROM categories WHERE shop_slug = ANY($1)", [shops]);

    // Seed Categories
    console.log('Inserting categories...');
    for (const shop of shops) {
      for (const cat of categories) {
        await client.query(
          `INSERT INTO categories (shop_slug, name, sort_order) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (shop_slug, name) DO NOTHING`,
          [shop, cat.name, cat.sort_order]
        );
      }
    }

    // Seed Menu Items
    console.log('Inserting menu items (products)...');
    for (const shop of shops) {
      let sortOrder = 0;
      for (const prod of products) {
        await client.query(
          `INSERT INTO menu_items (shop_slug, name, description, price, image_url, category, sub_category, is_active, sort_order) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
          [
            shop,
            prod.name,
            prod.desc,
            prod.price,
            prod.img || null,
            prod.category,
            prod.sub || null,
            sortOrder++
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding, rolling back:', err);
    await client.query('ROLLBACK').catch(e => console.error('Rollback error:', e));
  } finally {
    await client.end();
  }
}

seed();
