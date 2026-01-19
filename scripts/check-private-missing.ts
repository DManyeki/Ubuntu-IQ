import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: unis } = await supabase.from('universities')
        .select('name')
        .eq('ownership', 'Private')
        .or('location.is.null,location.eq.Kenya'); // Check null or default 'Kenya'

    if (unis && unis.length > 0) {
        console.log(`Missing Locations for ${unis.length} Private Unis:`);
        unis.forEach(u => console.log(u.name));
    } else {
        console.log("All Private Universities have specific locations.");
    }
}
main();
