const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const { URL } = require('url');

// Load environment variables from the root .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionUri = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionUri) {
  console.error("Thiếu biến môi trường DIRECT_URL hoặc DATABASE_URL trong .env");
  process.exit(1);
}

// Parse the connection URL
const parsedUrl = new URL(connectionUri);

const clientConfig = {
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  host: parsedUrl.hostname,
  port: parsedUrl.port || 5432,
  database: parsedUrl.pathname.substring(1).split('?')[0],
  ssl: {
    rejectUnauthorized: false
  }
};

console.log("Database Config details:", {
  user: clientConfig.user,
  host: clientConfig.host,
  port: clientConfig.port,
  database: clientConfig.database,
  passwordLength: clientConfig.password ? clientConfig.password.length : 0
});

const client = new Client(clientConfig);

async function run() {
  try {
    console.log("Đang kết nối tới database Supabase...");
    await client.connect();
    console.log("Kết nối database thành công!");

    const alterQuery = `
      ALTER TABLE menu_items 
      ADD COLUMN IF NOT EXISTS sub_category text;
    `;

    console.log("Đang thực hiện lệnh SQL: ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sub_category text;");
    await client.query(alterQuery);
    console.log("Đã thêm cột 'sub_category' vào bảng 'menu_items' thành công (hoặc cột đã tồn tại).");

  } catch (err) {
    console.error("Lỗi khi chạy lệnh migration:", err);
  } finally {
    await client.end();
    console.log("Đã ngắt kết nối database.");
  }
}

run();
