import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use explicit fallback if process.env fails, but log it
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log("DB URL:", url ? "Found" : "Missing");
console.log("DB Key:", key ? "Found" : "Missing");

const supabase = createClient(url || '', key || '');

async function run() {
    console.log("Fetching 1 program...");
    const { data: p, error: e1 } = await supabase.from('programs').select('*').limit(1);
    console.log("Program:", p ? JSON.stringify(p[0]) : "None", "Error:", e1?.message);

    console.log("Fetching 1 institution...");
    const { data: i, error: e2 } = await supabase.from('universities').select('*').limit(1);
    console.log("Institution:", i ? JSON.stringify(i[0]) : "None", "Error:", e2?.message);
}

run();
