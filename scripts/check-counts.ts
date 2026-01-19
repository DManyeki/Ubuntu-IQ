import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.from('universities')
        .select('ownership, id', { count: 'exact' });

    const counts: Record<string, number> = {};
    data?.forEach(d => {
        const o = d.ownership || 'NULL';
        counts[o] = (counts[o] || 0) + 1;
    });
    console.log("Counts:", counts);
}
main();
