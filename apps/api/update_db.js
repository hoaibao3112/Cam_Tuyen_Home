const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Updating category names in Supabase...");

  // Update Cơm, Bún, Phở to 'Món ăn healthy'
  const { data: d1, error: e1 } = await supabase
    .from('menu_items')
    .update({ category: 'Món ăn healthy' })
    .in('category', ['Cơm', 'Bún', 'Phở']);

  if (e1) console.error("Error updating healthy:", e1);
  else console.log("Updated healthy items");

  // Update Mì, Hủ tiếu to 'Món ăn vặt'
  const { data: d2, error: e2 } = await supabase
    .from('menu_items')
    .update({ category: 'Món ăn vặt' })
    .in('category', ['Mì', 'Hủ tiếu']);

  if (e2) console.error("Error updating snacks:", e2);
  else console.log("Updated snack items");

  // Update Đồ uống to 'Nước uống'
  const { data: d3, error: e3 } = await supabase
    .from('menu_items')
    .update({ category: 'Nước uống' })
    .eq('category', 'Đồ uống');

  if (e3) console.error("Error updating drinks:", e3);
  else console.log("Updated drinks items");

  // Log all items to check
  const { data: items, error: e4 } = await supabase
    .from('menu_items')
    .select('id, name, category');

  if (e4) console.error("Error fetching items:", e4);
  else console.log("Current items in DB:", items);
}

run();
