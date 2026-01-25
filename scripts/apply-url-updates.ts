import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const filePath = path.join('scripts', 'data', 'proposed_url_updates.json');
    if (!fs.existsSync(filePath)) {
        console.error("Proposed updates file not found");
        return;
    }

    const updates = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Applying ${updates.length} updates...`);

    for (const item of updates) {
        const { error } = await supabase
            .from('universities')
            .update({ website: item.url })
            .eq('id', item.id);

        if (error) {
            console.error(`Failed to update ${item.name}: ${error.message}`);
        } else {
            console.log(`Updated ${item.name}`);
        }
    }
    console.log("Done.");
}

main();
