require('dotenv').config({ path: './.env' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
});

async function setup() {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();

    console.log('Creating tables...');
    await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admissions (
      id BIGSERIAL PRIMARY KEY,
      "studentName" TEXT NOT NULL,
      grade TEXT NOT NULL,
      "parentName" TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      "dateSubmitted" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id BIGSERIAL PRIMARY KEY,
      month TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration TEXT,
      type TEXT DEFAULT 'Holiday'
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT,
      "isRead" BOOLEAN DEFAULT FALSE,
      "dateSubmitted" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id BIGSERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      alt TEXT,
      "dateAdded" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      type TEXT,
      date TIMESTAMPTZ DEFAULT NOW(),
      read BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS pages (
      id BIGSERIAL PRIMARY KEY,
      page_name TEXT UNIQUE NOT NULL,
      content JSONB NOT NULL
    );
  `);

    console.log('Tables created successfully!');
    await client.end();
}

setup().catch(e => {
    console.error('Error setting up DB:', e.message);
    process.exit(1);
});
