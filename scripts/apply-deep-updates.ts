import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const filePath = path.join('scripts', 'data', 'deep_scrape_results.json');
    if (!fs.existsSync(filePath)) {
        console.error("Deep scrape results file not found");
        return;
    }

    const updates = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Applying ${updates.length} phone updates...`);

    let success = 0;
    for (const item of updates) {
        if (!item.phone) continue;

        const { error } = await supabase
            .from('universities')
            .update({ phone: item.phone })
            .eq('id', item.id);

        if (error) {
            console.error(`Failed to update ${item.id}: ${error.message}`);
        } else {
            success++;
        }
    }
    console.log(`Deep Update: ${success} / ${updates.length}.`);
}

main();
