import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Exporting complete profiles...");
    const { data: institutions, error } = await supabase
        .from('universities')
        .select('id, name, website, phone, email, logo_url, description')
        .order('name');

    if (error) {
        console.error("Export failed:", error);
        return;
    }

    const outPath = path.join('scripts', 'data', 'complete_profiles.json');
    fs.writeFileSync(outPath, JSON.stringify(institutions, null, 2));
    console.log(`Exported ${institutions.length} profiles to ${outPath}`);
}

main();
