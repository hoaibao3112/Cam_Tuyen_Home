const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, name, category, sub_category, image_url');

  if (error) {
    console.error("Error fetching items:", error);
    process.exit(1);
  }

  console.log("TOTAL_ITEMS:", items.length);
  console.log(JSON.stringify(items, null, 2));
}

run();
