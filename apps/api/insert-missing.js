const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const missingProducts = [
  { name: "Combo sữa mix trứng non",   category: "Món ăn vặt", image_url: "/images/combo_sua_mix_trung_non.jpg" },
  { name: "Combo sữa siêu giòn",       category: "Món ăn vặt", image_url: "/images/combo_sua_sieu_gion.jpg" },
  { name: "Combo sữa thập cẩm nhỏ",   category: "Món ăn vặt", image_url: "/images/combo_sua_thap_cam_nho.jpg" },
  { name: "Combo sữa thập cẩm vừa",   category: "Món ăn vặt", image_url: "/images/combo_sua_thap_cam_vua.jpg" },
  { name: "Mì cay bò",                 category: "Món ăn vặt", image_url: "/images/mi_cay_bo.jpg" },
  { name: "Mì cay khô bò",             category: "Món ăn vặt", image_url: "/images/mi_cay_kho_bo.jpg" },
  { name: "Mì cay khô thập cẩm",       category: "Món ăn vặt", image_url: "/images/mi_cay_kho_thap_cam.jpg" },
  { name: "Mì cay thập cẩm",           category: "Món ăn vặt", image_url: "/images/mi_cay_thap_cam.jpg" },
  { name: "Súp nhỏ",                   category: "Món ăn vặt", image_url: "/images/sup_nho.jpg" },
  { name: "Súp lớn",                   category: "Món ăn vặt", image_url: "/images/sup_lon.jpg" },
];

async function run() {
  console.log(`Inserting ${missingProducts.length} missing products...`);

  for (const p of missingProducts) {
    const record = {
      shop_slug: 'quan-test',
      name: p.name,
      category: p.category,
      sub_category: null,
      image_url: p.image_url,
      price: 0,
      description: '',
      is_active: true
    };

    const { data, error } = await supabase
      .from('menu_items')
      .insert([record])
      .select();

    if (error) {
      console.error(`❌ Error inserting "${p.name}":`, error.message);
    } else {
      console.log(`✅ Inserted: ${p.name} (id: ${data[0].id})`);
    }
  }

  const { data: items } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact' });

  console.log(`\nTotal items in DB now: ${items.length}`);
}

run();
