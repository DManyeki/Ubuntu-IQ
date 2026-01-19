import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: unis } = await supabase.from('universities')
        .select('name, location')
        .eq('ownership', 'Private');

    if (unis) {
        console.log("Private Unis Locations:");
        console.table(unis);
    }
}
main();
