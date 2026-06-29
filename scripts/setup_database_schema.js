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

// Read the SQL files
const schemaSqlPath = path.join(__dirname, '../supabase-schema.sql');
const migrationSqlPath = path.join(__dirname, '../supabase-migration-002-sort-order.sql');

if (!fs.existsSync(schemaSqlPath) || !fs.existsSync(migrationSqlPath)) {
  console.error('Error: SQL files not found');
  process.exit(1);
}

const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

async function run() {
  try {
    await client.connect();
    console.log('Connected to database. Setting up schema...');

    await client.query('BEGIN');

    // Run supabase-schema.sql
    console.log('Running supabase-schema.sql...');
    await client.query(schemaSql);

    // Run supabase-migration-002-sort-order.sql
    console.log('Running supabase-migration-002-sort-order.sql...');
    await client.query(migrationSql);

    await client.query('COMMIT');
    console.log('🎉 Schema setup completed successfully!');
  } catch (err) {
    console.error('Error setting up schema, rolling back:', err);
    await client.query('ROLLBACK').catch(e => console.error('Rollback error:', e));
  } finally {
    await client.end();
  }
}

run();
