import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking for Non-.KE domains...");
    const { data: dbInsts } = await supabase.from('universities').select('id, name, website').not('website', 'is', null);

    if (!dbInsts) return;

    const issues = dbInsts.filter(i => !i.website.trim().toLowerCase().endsWith('.ke') && !i.website.trim().toLowerCase().endsWith('.ke/'));

    if (issues.length === 0) {
        console.log("All domains end with .ke");
    } else {
        console.log(`Found ${issues.length} non-.ke domains:`);
        issues.forEach(i => console.log(` - ${i.name}: ${i.website}`));
    }
}

main();
