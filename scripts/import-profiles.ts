import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const filePath = path.join('scripts', 'data', 'complete_profiles.json');
    if (!fs.existsSync(filePath)) {
        console.error("Profile file not found");
        return;
    }

    const profiles = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Importing ${profiles.length} profiles...`);

    // Batch processing not suitable due to partial data and constraints (Type column missing)
    // We will iterate and update specific fields
    let success = 0;
    for (const p of profiles) {
        const { error } = await supabase
            .from('universities')
            .update({
                name: p.name,
                website: p.website,
                phone: p.phone,
                email: p.email,
                logo_url: p.logo_url,
                description: p.description
            })
            .eq('id', p.id);

        if (error) console.error(`Error ${p.name}:`, error.message);
        else success++;
    }
    console.log(`Updated ${success} / ${profiles.length} profiles.`);
}

main();
