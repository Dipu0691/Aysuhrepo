require('dotenv').config({ path: './.env' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
});

async function refresh() {
    console.log('Connecting to Supabase PostgreSQL database to refresh schema cache...');
    await client.connect();

    console.log('Sending NOTIFY pgrst, reload schema...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    console.log('Schema cache flush command sent successfully. Waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));
    await client.end();
}

refresh().catch(e => {
    console.error('Error refreshing schema:', e.message);
    process.exit(1);
});
