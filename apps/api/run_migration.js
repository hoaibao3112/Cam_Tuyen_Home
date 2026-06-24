const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Read .env file to get DIRECT_URL
const envPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let directUrl = '';

envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*DIRECT_URL\s*=\s*["']?(.*?)["']?\s*$/);
  if (match) {
    directUrl = match[1];
  }
});

if (!directUrl) {
  console.error('Error: DIRECT_URL not found in .env');
  process.exit(1);
}

// 2. Read migration file
const sqlPath = path.join(__dirname, '../../supabase-migration-002-sort-order.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('Connecting to database...');

// Parse the connection URL using Node's built-in URL class (handles URL-encoded characters in username/password correctly)
const myUrl = new URL(directUrl);
const user = decodeURIComponent(myUrl.username);
const password = decodeURIComponent(myUrl.password);
const host = myUrl.hostname;
const port = myUrl.port ? parseInt(myUrl.port, 10) : 5432;
const database = myUrl.pathname.slice(1);

console.log(`Kết nối: Host=${host}, Port=${port}, DB=${database}, User=${user}`);

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

async function run() {
  try {
    await client.connect();
    console.log('Connected! Running migration SQL...');
    
    // Execute all SQL statements
    await client.query(sqlContent);
    
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

run();
