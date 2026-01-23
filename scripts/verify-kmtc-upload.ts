
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
    const { data, error, count } = await supabase
        .from('kmtc_campuses')
        .select('*', { count: 'exact', head: false })
        .limit(1);

    if (error) {
        console.error("Verify Error:", error);
    } else {
        console.log(`Table 'kmtc_campuses' row count: ${count}`); // Count might be null if not requesting head? select('*', {count: 'exact'})
        console.log("Sample Row:", data?.[0]);
    }
}

verify();
