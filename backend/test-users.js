require('dotenv').config();
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error('REST Error:', error);
    } else {
        console.log('Users via REST:', data);
    }
}

checkUsers();
