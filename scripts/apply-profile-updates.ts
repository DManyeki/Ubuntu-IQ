import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const filePath = path.join('scripts', 'data', 'scraped_profiles.json');
    if (!fs.existsSync(filePath)) {
        console.error("Scraped profiles file not found");
        return;
    }

    const profiles = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Applying ${profiles.length} profile updates...`);

    let success = 0;
    for (const p of profiles) {
        // Construct update object (only non-nulls)
        const update: any = {};
        if (p.description) update.description = p.description;
        if (p.logo) update.logo_url = p.logo;
        if (p.email) update.email = p.email;
        if (p.phone) update.phone = p.phone;

        if (Object.keys(update).length === 0) continue;

        const { error } = await supabase
            .from('universities')
            .update(update)
            .eq('id', p.id);

        if (error) {
            console.error(`Failed to update ${p.name}: ${error.message}`);
        } else {
            success++;
        }
    }
    console.log(`Successfully updated ${success} / ${profiles.length} profiles.`);
}

main();
